import { getPreferenceValues } from "@raycast/api";
import * as openpgp from "openpgp";
import * as fs from "fs/promises";
import { TOTP } from "otpauth";

interface PassboltResponse<T = unknown> {
  header: {
    id: string;
    status: string;
    servertime: number;
    action: string;
    message: string;
    url: string;
    code: number;
  };
  body: T;
}

interface MFAProvider {
  mfa_providers?: string[];
}

interface ResourceType {
  id: string;
  slug: string;
  name: string;
}

interface SecretData {
  id: string;
  user_id: string;
  resource_id: string;
  data: string;
  created: string;
  modified: string;
}

export class PassboltClient {
  private baseUrl: string;
  private privateKeyPath: string;
  private passphrase: string;
  private totpSecret: string | undefined;
  private accessToken: string | null = null;
  private refreshToken: string | null = null;
  private sessionCookie: string | null = null;
  private csrfToken: string | null = null;
  private isAuthenticated: boolean = false;

  constructor() {
    const prefs = getPreferenceValues<Preferences>();
    this.baseUrl = prefs.passboltUrl.replace(/\/$/, "");
    this.privateKeyPath = prefs.privateKey;
    this.passphrase = prefs.passphrase;
    this.totpSecret = prefs.totpSecret;
  }

  private async getPrivateKey(): Promise<openpgp.PrivateKey> {
    try {
      console.log(`Reading private key from: ${this.privateKeyPath}`);
      const keyContent = await fs.readFile(this.privateKeyPath, "utf8");

      let privateKey = await openpgp.readPrivateKey({ armoredKey: keyContent });

      if (!privateKey.isDecrypted()) {
        console.log("Key is encrypted, attempting to decrypt with passphrase...");
        try {
          privateKey = await openpgp.decryptKey({
            privateKey,
            passphrase: this.passphrase,
          });
          console.log("Private key decrypted successfully.");
        } catch (decryptError) {
          console.error("Failed to decrypt private key with provided passphrase:", decryptError);
          throw new Error("Invalid passphrase or corrupted key.");
        }
      } else {
        console.log("Private key is already decrypted.");
      }

      return privateKey;
    } catch (error) {
      console.error("Error reading private key:", error);
      if ((error as Error & { code?: string }).code === "ENOENT") {
        throw new Error(`Private key file not found at ${this.privateKeyPath}`);
      }
      throw error;
    }
  }

  private generateTOTP(): string {
    if (!this.totpSecret) {
      throw new Error("TOTP secret not configured");
    }

    const totp = new TOTP({
      secret: this.totpSecret,
      digits: 6,
      period: 30,
    });

    return totp.generate();
  }

  private async request(path: string, options: RequestInit = {}): Promise<Response> {
    const url = `${this.baseUrl}${path}`;
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      ...(options.headers as Record<string, string>),
    };

    // Add session cookie if we have one (for GPGAuth session)
    if (this.sessionCookie) {
      headers["Cookie"] = this.sessionCookie;
    }

    console.log(`Requesting ${url}`);
    const response = await fetch(url, { ...options, headers });

    // Handle set-cookie for session management
    const setCookie = response.headers.get("set-cookie");
    if (setCookie) {
      console.log("Received Set-Cookie:", setCookie);

      // Parse new cookies
      const newCookies: Record<string, string> = {};
      setCookie.split(",").forEach((cookieStr) => {
        const cookiePart = cookieStr.trim().split(";")[0];
        const [name, value] = cookiePart.split("=");
        if (name && value) {
          newCookies[name.trim()] = value.trim();
        }
      });

      // Merge with existing cookies
      const existingCookies: Record<string, string> = {};
      if (this.sessionCookie) {
        this.sessionCookie.split("; ").forEach((cookie) => {
          const [name, value] = cookie.split("=");
          if (name && value) {
            existingCookies[name] = value;
          }
        });
      }

      // Merge new cookies into existing
      Object.assign(existingCookies, newCookies);

      // Rebuild cookie string
      this.sessionCookie = Object.entries(existingCookies)
        .map(([name, value]) => `${name}=${value}`)
        .join("; ");

      // Extract CSRF token if present
      if (newCookies.csrfToken) {
        this.csrfToken = newCookies.csrfToken;
        console.log("CSRF token extracted:", this.csrfToken.substring(0, 20) + "...");
      }
    }

    if (!response.ok && response.status !== 403) {
      const text = await response.text();
      console.error(`API Error ${response.status}: ${text}`);
      throw new Error(`Passbolt API Error: ${response.status} ${response.statusText}`);
    }

    return response;
  }

  private generateChallenge(): string {
    // Generate UUID v4
    const uuid = "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, function (c) {
      const r = (Math.random() * 16) | 0;
      const v = c === "x" ? r : (r & 0x3) | 0x8;
      return v.toString(16);
    });
    return `gpgauthv1.3.0|36|${uuid}|gpgauthv1.3.0`;
  }

  private async refreshAccessToken() {
    if (!this.refreshToken) {
      throw new Error("No refresh token available");
    }

    console.log("Refreshing access token...");
    const response = await fetch(`${this.baseUrl}/auth/jwt/refresh.json`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        refresh_token: this.refreshToken,
      }),
    });

    if (!response.ok) {
      throw new Error("Failed to refresh access token");
    }

    const json = (await response.json()) as PassboltResponse<{ access_token: string }>;
    this.accessToken = json.body.access_token;
    console.log("Access token refreshed successfully");
  }

  public async authenticate() {
    // Skip if already authenticated
    if (this.isAuthenticated) {
      return;
    }

    try {
      console.log("Starting GPGAuth authentication...");

      // 1. Get Server Public Key
      const verifyRes = await this.request("/auth/verify.json");
      const verifyJson = (await verifyRes.json()) as PassboltResponse<{ keydata: string }>;
      const serverKeyArmored = verifyJson.body.keydata;
      const serverKey = await openpgp.readKey({ armoredKey: serverKeyArmored });
      console.log("Server Key ID:", serverKey.getKeyID().toHex());

      // 2. Get User Private Key
      const userPrivateKey = await this.getPrivateKey();
      const userFingerprint = userPrivateKey.getFingerprint();
      console.log("User Fingerprint:", userFingerprint);

      // 3. Stage 1 Login: Send Key ID
      const login1Res = await this.request("/auth/login.json", {
        method: "POST",
        body: JSON.stringify({
          data: {
            gpg_auth: {
              keyid: userFingerprint,
            },
          },
        }),
      });

      console.log("Login stage 1 status:", login1Res.status);
      console.log("Login stage 1 headers:", Object.fromEntries(login1Res.headers.entries()));

      const nonceHeader = login1Res.headers.get("x-gpgauth-user-auth-token");
      if (!nonceHeader) {
        // Check if we're already authenticated
        const login1Json = (await login1Res.json()) as PassboltResponse;
        console.log("Login stage 1 response:", JSON.stringify(login1Json).substring(0, 300));

        // If already authenticated, just return
        if (login1Json.header && login1Json.header.status === "success") {
          console.log("Already authenticated, skipping nonce verification");
          this.isAuthenticated = true;
          return;
        }

        throw new Error("Server did not return a nonce token.");
      }

      // 4. Decrypt Nonce
      let encryptedNonce = decodeURIComponent(nonceHeader);
      console.log("Raw Nonce (first 50 chars):", encryptedNonce.substring(0, 50));

      // Sanitize nonce
      encryptedNonce = encryptedNonce.replace(/-----BEGIN\\\+PGP\\\+MESSAGE-----/g, "-----BEGIN PGP MESSAGE-----");
      encryptedNonce = encryptedNonce.replace(/-----END\\\+PGP\\\+MESSAGE-----/g, "-----END PGP MESSAGE-----");
      encryptedNonce = encryptedNonce.replace(/\\\+/g, "+");

      const message = await openpgp.readMessage({ armoredMessage: encryptedNonce });
      const { data: decryptedNonce } = await openpgp.decrypt({
        message,
        decryptionKeys: [userPrivateKey],
      });

      console.log("Decrypted nonce:", String(decryptedNonce));

      // 5. Stage 2 Login: Send Decrypted Nonce in PLAINTEXT
      const login2Res = await this.request("/auth/login.json", {
        method: "POST",
        body: JSON.stringify({
          data: {
            gpg_auth: {
              keyid: userFingerprint,
              user_token_result: String(decryptedNonce), // Send PLAINTEXT nonce!
            },
          },
        }),
      });

      const login2Json = (await login2Res.json()) as PassboltResponse<MFAProvider>;
      console.log("Login stage 2 response:", JSON.stringify(login2Json).substring(0, 300));

      // Check if MFA is required
      if (login2Json.body && login2Json.body.mfa_providers) {
        console.log("MFA required. Providers:", login2Json.body.mfa_providers);

        if (!this.totpSecret) {
          throw new Error(
            "MFA is required but no TOTP secret provided. Please add your TOTP secret in the extension preferences.",
          );
        }

        // Send TOTP for verification
        console.log("Sending TOTP for MFA verification...");
        const mfaRes = await this.request("/mfa/verify/totp.json", {
          method: "POST",
          body: JSON.stringify({
            totp: this.generateTOTP(),
          }),
        });

        const mfaJson = await mfaRes.json();
        if ((mfaJson as PassboltResponse).header && (mfaJson as PassboltResponse).header.status === "error") {
          throw new Error(`MFA verification failed: ${(mfaJson as PassboltResponse).header.message}`);
        }

        console.log("MFA verification successful!");
      } else if (login2Json.header && login2Json.header.status === "error") {
        console.error("Authentication stage 2 failed:", login2Json.header.message);
        throw new Error(`Authentication failed: ${login2Json.header.message}`);
      }

      console.log("GPGAuth authentication successful!");
      this.isAuthenticated = true;
    } catch (error) {
      console.error("GPGAuth authentication failed:", error);
      this.isAuthenticated = false;
      throw error;
    }
  }

  public async searchResources(query: string) {
    await this.authenticate();

    let res = await this.request(
      `/resources.json?filter[keywords]=${encodeURIComponent(query)}&contain[secret]=1&contain[tags]=1`,
    );

    // Check if MFA is required (403 response)
    if (res.status === 403) {
      const errorJson = (await res.json()) as PassboltResponse<MFAProvider>;
      if (errorJson.body && errorJson.body.mfa_providers) {
        console.log("MFA required for resource access. Providers:", errorJson.body.mfa_providers);

        if (!this.totpSecret) {
          throw new Error(
            "MFA is required but no TOTP secret provided. Please add your TOTP secret in the extension preferences.",
          );
        }

        // Send TOTP for verification
        console.log("Sending TOTP for MFA verification...");
        const mfaHeaders: Record<string, string> = {};
        if (this.csrfToken) {
          mfaHeaders["X-CSRF-Token"] = this.csrfToken;
          console.log("Including CSRF token in MFA request");
        }
        const mfaRes = await this.request("/mfa/verify/totp.json", {
          method: "POST",
          headers: mfaHeaders,
          body: JSON.stringify({
            totp: this.generateTOTP(),
          }),
        });

        const mfaJson = await mfaRes.json();
        console.log("MFA response:", JSON.stringify(mfaJson).substring(0, 200));

        if ((mfaJson as PassboltResponse).header && (mfaJson as PassboltResponse).header.status === "error") {
          throw new Error(`MFA verification failed: ${(mfaJson as PassboltResponse).header.message}`);
        }

        console.log("MFA verification successful! Retrying resource request...");

        // Retry the request after MFA verification
        res = await this.request(
          `/resources.json?filter[keywords]=${encodeURIComponent(query)}&contain[secret]=1&contain[tags]=1`,
        );
      }
    }

    return res.json() as Promise<PassboltResponse>;
  }

  public async getSecret(resourceId: string) {
    // Ensure we're authenticated before fetching secret
    await this.authenticate();

    const res = await this.request(`/secrets/resource/${resourceId}.json`);
    const json = (await res.json()) as PassboltResponse<SecretData>;
    return json.body;
  }

  public async decryptSecret(encryptedData: string) {
    const userPrivateKey = await this.getPrivateKey();
    const message = await openpgp.readMessage({ armoredMessage: encryptedData });
    const { data: decrypted } = await openpgp.decrypt({
      message,
      decryptionKeys: userPrivateKey,
    });

    // Parse the decrypted JSON to extract the password
    try {
      const secretData = JSON.parse(decrypted as string);
      // Return just the password field if it exists, otherwise return the whole decrypted data
      return secretData.password || (decrypted as string);
    } catch {
      // If it's not JSON, return as-is
      return decrypted as string;
    }
  }

  public async getResourceTypes() {
    await this.authenticate();
    const res = await this.request("/resource-types.json");
    const json = (await res.json()) as PassboltResponse<ResourceType[]>;
    return json.body;
  }

  public async createResource(data: {
    name: string;
    username: string;
    uri: string;
    password: string;
    description: string;
  }) {
    await this.authenticate();

    // 1. Get Resource Type ID for "Password"
    const types = await this.getResourceTypes();
    const passwordType = types.find((t: ResourceType) => t.slug === "password");
    if (!passwordType) {
      throw new Error("Could not find 'password' resource type.");
    }

    // 2. Prepare Keys
    const userPrivateKey = await this.getPrivateKey();
    const userPublicKey = userPrivateKey.toPublic();

    // 3. Encrypt Metadata
    const metadataJson = JSON.stringify({
      name: data.name,
      username: data.username,
      uri: data.uri,
      description: data.description,
    });

    const unsignedMetadata = await openpgp.createMessage({ text: metadataJson });
    const encryptedMetadata = await openpgp.encrypt({
      message: unsignedMetadata,
      encryptionKeys: userPublicKey,
      signingKeys: userPrivateKey,
    });

    // 4. Encrypt Secret (Password)
    const unsignedSecret = await openpgp.createMessage({ text: data.password });
    const encryptedSecret = await openpgp.encrypt({
      message: unsignedSecret,
      encryptionKeys: userPublicKey,
      signingKeys: userPrivateKey,
    });

    // 5. Send Request
    // Note: The API sample showed "secrets": ["..."] but usually it's an object or the API expects a specific format.
    // The sample showed "secrets": ["-----BEGIN PGP MESSAGE-----"]
    // Let's try sending the string directly in the array as per sample.
    const payload = {
      resource_type_id: passwordType.id,
      personal: true,
      folder_parent_id: null,
      metadata: encryptedMetadata,
      secrets: [encryptedSecret],
    };

    await this.request("/resources.json", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  }
}
