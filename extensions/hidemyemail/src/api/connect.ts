import axios, {
  AxiosError,
  AxiosHeaders,
  AxiosInstance,
  AxiosRequestConfig,
  AxiosRequestHeaders,
  AxiosResponse,
} from "axios";
import { v1 as uuidv1 } from "uuid";

import { SRP, SrpClient } from "fast-srp-hap";
import { CookieJar } from "tough-cookie";
import { wrapper } from "axios-cookiejar-support";
import { HideMyEmailService } from "./hide-my-email";

import {
  ERROR_MAPPINGS,
  iCloud2FAError,
  iCloudAPIResponseError,
  iCloudFailedLoginError,
  iCloudNetworkError,
  iCloudServiceNotActivatedError,
  iCloudSessionExpiredError,
} from "./errors";
import { LocalStorage } from "@raycast/api";
import { getNestedHeader, hashPassword } from "./utils";

const ENDPOINTS = {
  DEFAULT: {
    AUTH_ENDPOINT: "https://idmsa.apple.com/appleauth/auth",
    HOME_ENDPOINT: "https://www.icloud.com",
    SETUP_ENDPOINT: "https://setup.icloud.com/setup/ws/1",
  },
  CHINA: {
    AUTH_ENDPOINT: "https://idmsa.apple.com/appleauth/auth",
    HOME_ENDPOINT: "https://www.icloud.com.cn",
    SETUP_ENDPOINT: "https://setup.icloud.com.cn/setup/ws/1",
  },
};

interface ErrorData {
  error?: string;
  reason?: string;
  [key: string]: unknown;
}

export class iCloudSession {
  static HEADER_DATA: { [key: string]: string } = {
    "x-apple-id-account-country": "accountCountry",
    "x-apple-id-session-id": "sessionID",
    "x-apple-session-token": "sessionToken",
    "x-apple-twosv-trust-token": "trustToken",
    scnt: "scnt",
  };

  private service: iCloudService;
  private jar!: CookieJar;
  public instance!: AxiosInstance;

  constructor(service: iCloudService) {
    this.service = service;
  }

  async init() {
    const cookieJarData = await LocalStorage.getItem<string>(this.service.cookieJarKey);
    if (cookieJarData) {
      const parsedCookies = JSON.parse(cookieJarData);
      this.jar = CookieJar.deserializeSync(parsedCookies);
    } else {
      this.jar = new CookieJar();
    }

    this.instance = wrapper(
      axios.create({
        jar: this.jar,
        timeout: 30000,
      }),
    );

    // Handles 409 status code
    this.instance.interceptors.response.use(
      (response) => {
        return response;
      },
      (error) => {
        if (error.response && error.response.status === 409) {
          return Promise.resolve(error.response);
        }
        return Promise.reject(error);
      },
    );

    this.instance.interceptors.response.use(
      (response) => {
        return response;
      },
      (error) => {
        console.log("------- Error -------");
        console.log("------- Request -------");
        console.log("Request URL:", error.config.url);
        console.log("Request Headers:");
        for (const key in error.config.headers) {
          console.log(`${key}: ${error.config.headers[key]}`);
        }
        console.log("------- Response -------");
        const response = error?.response;
        if (response) {
          console.log("Status: ", response.status);
          console.log("StatusText: ", response.statusText);
          console.log("Data: ", response.data);
        } else {
          console.log("error.code: ", error.code);
          console.log("error.message: ", error.message);
        }
        console.log("------- ----- -------");

        return Promise.reject(error);
      },
    );
  }

  get headers() {
    return this.instance.defaults.headers;
  }

  get cookieJar(): CookieJar {
    return this.jar;
  }

  async request(
    method: string,
    url: string,
    options: AxiosRequestConfig = {},
    updateLocalStorage: boolean = true,
  ): Promise<AxiosResponse> {
    try {
      const response = await this.instance.request({ method, url, ...options });

      Object.entries(iCloudSession.HEADER_DATA).forEach(([header, value]) => {
        const headerValue = getNestedHeader(response.headers, header);
        if (headerValue) this.service.updateSessionData(value, headerValue);
      });

      if (updateLocalStorage) {
        // Saving session data
        await this.service.storeSessionData();

        // Saving cookies
        const cookies = this.jar.serializeSync();
        await LocalStorage.setItem(this.service.cookieJarKey, JSON.stringify(cookies));
      }

      return response;
    } catch (error) {
      if (axios.isAxiosError(error)) throw this.getError(error);

      console.log("An unexpected error occurred: ", error);
      throw error;
    }
  }

  getError(error: AxiosError) {
    const response = error?.response;
    if (!response && error?.request) {
      return new iCloudNetworkError("Network error: Please check your internet connection and try again.", {
        cause: error,
      });
    } else if (!response) {
      return new Error("An unexpected error occurred.", { cause: error });
    }

    let reason: string = error.message;
    let code: string = error.code || "";

    const errorData = response?.data as ErrorData;
    if (errorData) {
      reason = errorData?.reason || errorData?.error || response.statusText;
      code = errorData.error || String(response.status);

      for (const key in errorData) {
        if (Array.isArray(errorData[key]) && errorData[key]?.length > 0) {
          const errorList = errorData[key];
          reason = errorList[0]?.message;
          code = errorList[0]?.code;
        }
      }
    }

    if (
      (error.status === 421 && errorData?.trustTokens) ||
      (error.status == 401 && reason === "Invalid global session")
    ) {
      return new iCloudSessionExpiredError("Session expired");
    }

    if (["ZONE_NOT_FOUND", "AUTHENTICATION_FAILED"].includes(code)) {
      reason = "Please log into https://icloud.com/ to manually " + "finish setting up your iCloud service";
      return new iCloudServiceNotActivatedError(reason);
    }

    if (code == "503") reason += ". Are you using a VPN?";

    if (code in ERROR_MAPPINGS) {
      reason = ERROR_MAPPINGS[code];
    }

    return new iCloudAPIResponseError(reason);
  }
}

export class iCloudService {
  private appleID: string;
  private clientID: string;
  private session: iCloudSession;
  private authEndpoint: string;
  private homeEndpoint: string;
  private setupEndpoint: string;

  private webservices!: Record<string, unknown>;
  private sessionData: Record<string, unknown> = {};
  private data!: {
    dsInfo: Record<string, unknown>;
    webservices: Record<string, unknown>;
    hsaChallengeRequired?: string;
    hsaTrustedBrowser?: string;
  };

  constructor(appleID: string, options: Options = {}) {
    this.appleID = appleID;
    this.clientID = `auth-${uuidv1().toLowerCase()}`;
    this.session = new iCloudSession(this);
    const endpointCountry = options.useChineseAccount ? "CHINA" : "DEFAULT";
    this.authEndpoint = ENDPOINTS[endpointCountry].AUTH_ENDPOINT;
    this.homeEndpoint = ENDPOINTS[endpointCountry].HOME_ENDPOINT;
    this.setupEndpoint = ENDPOINTS[endpointCountry].SETUP_ENDPOINT;
  }

  async init() {
    const sessionData = await LocalStorage.getItem<string>(this.sessionKey);

    if (sessionData) {
      this.sessionData = JSON.parse(sessionData);
    }

    if (this.sessionData?.clientID) {
      this.clientID = this.sessionData.clientID as string;
    } else {
      this.sessionData.clientID = this.clientID;
    }

    await this.session.init();
    Object.assign(this.session.instance.defaults.headers.common, {
      Origin: this.homeEndpoint,
      Referer: `${this.homeEndpoint}/`,
    });
  }

  async authenticate(password: string | null = null) {
    let loginSuccessful = false;
    if (this.sessionData?.sessionToken && !password) {
      try {
        const data = await this.validateToken();
        this.data = data;
        loginSuccessful = true;
      } catch (error) {
        if (error instanceof iCloudAPIResponseError) {
          console.log("Invalid authentication token, will log in from scratch.");
        } else {
          throw error;
        }
      }
    }

    if (password && !loginSuccessful) {
      try {
        await this.srpAuthenticate(password);
      } catch (error) {
        // Fallback (fix for issues #16451, #16368)
        await this.authenticateWithPassword(password);
      }
      await this.authenticateWithToken();
    }

    if (!loginSuccessful && !password) {
      throw new iCloudFailedLoginError("Please provide credentials.");
    }

    this.webservices = this.data?.webservices;
  }

  async authenticateWithPassword(password: string) {
    try {
      const data: Record<string, unknown> = { accountName: this.appleID, password: password };
      data["rememberMe"] = true;

      if (this.sessionData?.trust_token) data["trustTokens"] = [this.sessionData.trust_token];

      const headers = this.getAuthHeaders(true);
      const params = { isRememberMeEnabled: true };

      await this.session.request("post", `${this.authEndpoint}/signin`, { params, headers, data });
    } catch (error) {
      if (error instanceof iCloudAPIResponseError) throw new iCloudFailedLoginError(error.message, { cause: error });
      throw error;
    }
  }

  async srpAuthenticate(password: string) {
    // --- Perform SRP protocol ---

    // Request to obtain salt, public key is not passed yet
    let data: Record<string, unknown> = {
      a: "placeholder",
      accountName: this.appleID,
      protocols: ["s2k", "s2k_fo"],
    };

    let m1;
    let m2;
    let c;
    try {
      let response = await this.session.request("post", `${this.authEndpoint}/signin/init`, {
        data,
        headers: this.getAuthHeaders(),
      });
      const salt = Buffer.from(response.data.salt, "base64");
      const iterations = response.data.iteration;

      // NOTE: there could be the unlikely scenario that salt/iterations changes in between these two calls

      // Ephemeral client key `a` (which is secret)
      const hashedPassword = hashPassword(password, salt, iterations);
      const a = await SRP.genKey();
      const srpClient = new SrpClient(SRP.params[2048], salt, Buffer.from(this.appleID), hashedPassword, a);

      // Make actual request with public key A to receive public key B
      data.a = srpClient.computeA().toString("base64");
      response = await this.session.request("post", `${this.authEndpoint}/signin/init`, {
        data,
        headers: this.getAuthHeaders(),
      });
      c = response.data.c;
      const B = Buffer.from(response.data.b, "base64");

      // Set server's public key and compute evidence of same session key
      srpClient.setB(B);
      m1 = srpClient.computeM1();
      m2 = srpClient.computeM2();
    } catch (error) {
      if (error instanceof iCloudAPIResponseError)
        throw new iCloudFailedLoginError(`SRP initiation failed.`, { cause: error });
      throw error;
    }

    if (m1 && m2 && c) {
      try {
        // Send keys to server
        data = {
          accountName: this.appleID,
          c: c,
          m1: m1.toString("base64"),
          m2: m2.toString("base64"),
          rememberMe: true,
          trustTokens: [],
        };
        // Sets session token
        await this.session.request("post", `${this.authEndpoint}/signin/complete`, {
          data,
          params: { isRememberMeEnabled: "true" },
          headers: this.getAuthHeaders(),
        });
      } catch (error) {
        if (error instanceof iCloudAPIResponseError) throw new iCloudFailedLoginError(error.message, { cause: error });
        throw error;
      }
    }
  }

  async authenticateWithToken() {
    const data: Record<string, unknown> = {
      accountCountryCode: this.sessionData.accountCountry || "",
      dsWebAuthToken: this.sessionData.sessionToken || "",
      extended_login: true,
      trustToken: this.sessionData.trustToken || "",
    };

    try {
      const response = await this.session.request("post", `${this.setupEndpoint}/accountLogin`, { data });
      this.data = response.data;
    } catch (error) {
      if (error instanceof iCloudAPIResponseError)
        throw new iCloudFailedLoginError("Invalid authentication token.", { cause: error });
      throw error;
    }
  }

  async validateToken() {
    const response = await this.session.request("post", `${this.setupEndpoint}/validate`);
    return response.data;
  }

  get requires2FA() {
    return (
      (this.data?.dsInfo?.hsaVersion ?? 0) == 2 &&
      ((this.data?.hsaChallengeRequired ?? false) || !this.isTrustedSession)
    );
  }

  get isTrustedSession() {
    return this.data?.hsaTrustedBrowser || false;
  }

  async validate2FACode(code: string) {
    const data = { securityCode: { code: code } };
    const headers = this.getAuthHeaders(true);

    await this.session.request("post", `${this.authEndpoint}/verify/trusteddevice/securitycode`, {
      data,
      headers,
    });
    const isTrusted = await this.trustSession();
    if (!isTrusted) {
      console.log("Failed to request trust. You will likely be prompted for the code again in the coming weeks");
    }
  }

  async sendVerificationCode() {
    const headers = this.getAuthHeaders(true);

    // ICDRSCapableDeviceCount, proxy for no linked devices, so send using trusted phone number
    if (!this.data?.dsInfo?.ICDRSCapableDeviceCount) {
      try {
        const data = { phoneNumber: { id: 1 }, mode: "sms" };
        const response = await this.session.request("put", `${this.authEndpoint}/verify/phone`, {
          data,
          headers,
        });
        return response.data?.phoneNumber?.lastTwoDigits;
      } catch (error) {
        if (error instanceof iCloudAPIResponseError) throw new iCloud2FAError(error.message, { cause: error });
        throw error;
      }
    }

    // There is a trusted device
    await this.session.request("put", `${this.authEndpoint}/verify/trusteddevice/securitycode`, { headers });
    return null;
  }

  async trustSession() {
    const headers = this.getAuthHeaders(true);

    try {
      await this.session.request("get", `${this.authEndpoint}/2sv/trust`, { headers });
      await this.authenticateWithToken();
      return true;
    } catch (error) {
      console.log("Session trust failed.");
      return false;
    }
  }

  async logOut() {
    const data = { trustBrowser: true, allBrowsers: false };
    const headers = this.getAuthHeaders();
    await this.session.request("post", `${this.setupEndpoint}/logout`, { headers, data });
  }

  updateSessionData(key: string, value: string) {
    this.sessionData[key] = value;
  }

  async storeSessionData() {
    await LocalStorage.setItem(this.sessionKey, JSON.stringify(this.sessionData));
  }

  getAuthHeaders(addSessionData = false): AxiosRequestHeaders {
    const headers = new AxiosHeaders();
    headers.set("Accept", "application/json, text/javascript");
    headers.set("Content-Type", "application/json");
    headers.set("X-Apple-OAuth-Client-Id", "d39ba9916b7251055b22c7f910e2ea796ee65e98b2ddecea8f5dde8d9d1a815d");
    headers.set("X-Apple-OAuth-Client-Type", "firstPartyAuth");
    headers.set("X-Apple-OAuth-Redirect-URI", "https://www.icloud.com");
    headers.set("X-Apple-OAuth-Require-Grant-Code", "true");
    headers.set("X-Apple-OAuth-Response-Mode", "web_message");
    headers.set("X-Apple-OAuth-Response-Type", "code");
    headers.set("X-Apple-OAuth-State", this.clientID);
    headers.set("X-Apple-Widget-Key", "d39ba9916b7251055b22c7f910e2ea796ee65e98b2ddecea8f5dde8d9d1a815d");

    if (addSessionData) {
      if (this.sessionData?.scnt) {
        headers.set("scnt", this.sessionData.scnt as string);
      }
      if (this.sessionData?.sessionID) {
        headers.set("X-Apple-ID-Session-Id", this.sessionData.sessionID as string);
      }
    }

    return headers;
  }

  getWebserviceUrl(wsKey: string): string {
    const hmeService = this.webservices?.[wsKey] as { url: string };
    return hmeService?.url ?? "";
  }

  get cookieJarKey() {
    return this.appleID + ".cookies";
  }

  get sessionKey() {
    return this.appleID + ".session";
  }

  get dsInfo() {
    return this.data?.dsInfo || undefined;
  }

  get hideMyEmail() {
    const serviceRoot = this.getWebserviceUrl("premiummailsettings");
    return new HideMyEmailService(serviceRoot, this, this.session);
  }
}

interface Options {
  useChineseAccount?: boolean;
}
