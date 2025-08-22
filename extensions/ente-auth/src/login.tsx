// src/login.tsx
import { Action, ActionPanel, Form, showToast, Toast, useNavigation } from "@raycast/api";
import { useState } from "react";
import { getApiClient, resetApiClient } from "./services/api";
import { getStorageService } from "./services/storage";
import { deriveKeyEncryptionKey, decryptMasterKey, decryptSecretKey, decryptSessionToken } from "./services/crypto";
import { determineAuthMethod, SRPAuthenticationService } from "./services/srp";
import { AuthorizationResponse, UserCredentials } from "./types";

export default function Login() {
  const { pop } = useNavigation();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | undefined>();
  const [otpRequested, setOtpRequested] = useState(false);
  const [useSRP, setUseSRP] = useState(false);

  const handleSubmit = async (values: { email: string; password?: string; otp?: string }) => {
    if (!values.email) {
      setError("Email is required");
      return;
    }

    setIsLoading(true);
    setError(undefined);

    try {
      const apiClient = await getApiClient();

      if (!otpRequested) {
        // Check SRP attributes to determine authentication method (like CLI does)
        const toast = await showToast({ style: Toast.Style.Animated, title: "Checking authentication method..." });

        try {
          const authMethod = await determineAuthMethod(values.email);

          if (authMethod === "srp") {
            console.log("DEBUG: SRP authentication available - requesting password for SRP flow");
            setUseSRP(true);
            setOtpRequested(true);
            toast.style = Toast.Style.Success;
            toast.title = "Enter your password to continue";
          } else {
            console.log("DEBUG: Using email OTP authentication method");
            setUseSRP(false);
            await apiClient.requestEmailOTP(values.email);
            setOtpRequested(true);
            toast.style = Toast.Style.Success;
            toast.title = "Verification code sent";
          }
        } catch (error) {
          console.error("DEBUG: Error determining auth method:", error);
          // Fall back to email OTP if SRP check fails
          await apiClient.requestEmailOTP(values.email);
          setOtpRequested(true);
          toast.style = Toast.Style.Success;
          toast.title = "Verification code sent";
        }
      } else {
        if (!values.password) {
          setError("Password is required");
          setIsLoading(false);
          return;
        }

        // Check if we should use SRP or email OTP authentication
        if (useSRP) {
          // SRP authentication doesn't need OTP, just password
          const toast = await showToast({ style: Toast.Style.Animated, title: "Authenticating with SRP..." });

          console.log("DEBUG: Using SRP authentication for full session privileges");

          try {
            const response = await SRPAuthenticationService.performSRPAuthentication(values.email, values.password);

            console.log("DEBUG: ✅ SRP authentication successful! Processing session token...");

            if (!response.keyAttributes || !response.encryptedToken) {
              throw new Error("SRP response missing required data");
            }

            // [PHASE 1] Derive keys first to enable storage operations
            console.log("DEBUG: [PHASE 1] Deriving cryptographic keys for storage operations");

            // Derive KEK from password for token decryption
            const keyEncryptionKey = await deriveKeyEncryptionKey(
              values.password,
              response.keyAttributes.kekSalt,
              response.keyAttributes.memLimit,
              response.keyAttributes.opsLimit,
            );

            // Continue with token decryption using the derived KEK
            const masterKey = await decryptMasterKey(
              response.keyAttributes.encryptedKey,
              response.keyAttributes.keyDecryptionNonce,
              keyEncryptionKey,
            );

            // Set master key in memory FIRST to enable storage operations
            const storage = getStorageService();
            storage.setMasterKey(masterKey);
            console.log("DEBUG: Master key set in memory for storage operations");

            // Now store encrypted token for later processing (web app pattern)
            console.log("DEBUG: [PHASE 1] Storing encrypted token from SRP response (matching web app pattern)");
            await storage.storeEncryptedToken(response.id, response.encryptedToken);
            await storage.storePartialCredentials(values.email, response.id, response.encryptedToken);

            // [PHASE 2] Complete token decryption and activation (web app pattern)
            console.log("DEBUG: [PHASE 2] Completing token decryption and activation (matching web app pattern)");

            const secretKey = await decryptSecretKey(
              response.keyAttributes.encryptedSecretKey,
              response.keyAttributes.secretKeyDecryptionNonce,
              masterKey,
            );

            const token = await decryptSessionToken(
              response.encryptedToken,
              response.keyAttributes.publicKey,
              secretKey,
            );

            if (!token) {
              throw new Error("Decrypted token is empty. Final decryption failed.");
            }

            console.log("DEBUG: [PHASE 2] Token decrypted successfully, activating for API access");

            // Store credentials and activate token (web app pattern)
            const credentials: UserCredentials = {
              email: values.email,
              userId: response.id,
              token: token,
              masterKey: masterKey,
              keyAttributes: response.keyAttributes,
            };

            storage.setMasterKey(masterKey);
            await storage.storeCredentials(credentials);

            // Activate the token for API access (matching web app's saveAuthToken)
            await storage.activateToken(token);

            const authContext = {
              userId: response.id,
              accountKey: `auth-${response.id}`,
              userAgent: "Raycast/Ente-Auth/1.0.0",
            };

            await storage.storeAuthenticationContext(authContext);

            // Clear the encrypted token since we've processed it
            await storage.clearEncryptedToken();

            // CRITICAL FIX: Reset the API client instance to clear old cached token
            console.log("DEBUG: 🔧 CRITICAL FIX: Resetting API client to clear cached expired token");
            resetApiClient();

            // CRITICAL FIX: Reset sync state to force fresh initial sync
            console.log("DEBUG: 🔧 CRITICAL FIX: Resetting sync state for clean initial sync");
            await storage.resetSyncState();

            // Get fresh API client instance that will use the new activated token
            console.log("DEBUG: 🔧 CRITICAL FIX: Getting fresh API client with new token");
            const freshApiClient = await getApiClient();
            console.log("DEBUG: Fresh token being used:", token);

            // Test token validity with SRP-derived session
            console.log("DEBUG: Testing SRP token validity after two-phase activation...");
            const isTokenValid = await freshApiClient.testTokenValidity();
            if (isTokenValid) {
              console.log("DEBUG: ✅ SRP Authentication successful - full API access granted!");
            } else {
              console.warn("DEBUG: SRP token validation failed - but proceeding");
            }

            toast.style = Toast.Style.Success;
            toast.title = "SRP Login successful!";
            pop();
            return;
          } catch (error) {
            console.error("DEBUG: SRP authentication failed, falling back to email OTP:", error);
            // Fall back to email OTP if SRP fails
            setUseSRP(false);
            await apiClient.requestEmailOTP(values.email);
            toast.style = Toast.Style.Success;
            toast.title = "Verification code sent";
            return;
          }
        }

        // Email OTP authentication (fallback or primary method)
        if (!values.otp) {
          setError("Verification code is required");
          setIsLoading(false);
          return;
        }

        const toast = await showToast({ style: Toast.Style.Animated, title: "Verifying with email OTP..." });
        const response: AuthorizationResponse = await apiClient.verifyEmailOTP(values.email, values.otp);
        console.log("DEBUG: Received authorization response from email OTP.");

        // [Step 1] Derive the KEK from the password
        const keyEncryptionKey = await deriveKeyEncryptionKey(
          values.password,
          response.keyAttributes.kekSalt,
          response.keyAttributes.memLimit,
          response.keyAttributes.opsLimit,
        );

        // [Step 2] Decrypt the Master Key (MK) using the KEK
        const masterKey = await decryptMasterKey(
          response.keyAttributes.encryptedKey,
          response.keyAttributes.keyDecryptionNonce,
          keyEncryptionKey,
        );

        // [+] THE FIX: [Step 3] Decrypt the Secret Key (SK) using the MK. This is a required step.
        const secretKey = await decryptSecretKey(
          response.keyAttributes.encryptedSecretKey,
          response.keyAttributes.secretKeyDecryptionNonce,
          masterKey,
        );

        // [+] THE FIX: [Step 4] Use the SECRET KEY (SK) and PUBLIC KEY to decrypt the session token.
        // Session tokens use sealed box encryption (anonymous public key encryption)
        const token = await decryptSessionToken(response.encryptedToken, response.keyAttributes.publicKey, secretKey);

        if (!token) {
          throw new Error("Decrypted token is empty. Final decryption failed.");
        }

        const storage = getStorageService();
        const credentials: UserCredentials = {
          email: values.email,
          userId: response.id, // [+] Include user ID from authorization response
          token: token,
          masterKey: masterKey,
          keyAttributes: response.keyAttributes,
        };

        storage.setMasterKey(masterKey);
        await storage.storeCredentials(credentials);

        // [+] Create and store authentication context - match CLI pattern
        const authContext = {
          userId: response.id,
          accountKey: `auth-${response.id}`, // CLI AccountKey() format: "{app}-{userID}"
          userAgent: "Raycast/Ente-Auth/1.0.0",
        };

        await storage.storeAuthenticationContext(authContext);

        apiClient.setToken(token);
        apiClient.setAuthenticationContext(authContext);

        // [+] Test token validity with comprehensive endpoint testing
        console.log("DEBUG: Testing token validity after login with comprehensive endpoint testing...");
        const isTokenValid = await apiClient.testTokenValidity();
        if (!isTokenValid) {
          console.warn("DEBUG: Token validation failed - but proceeding with login since authentication succeeded");
        } else {
          console.log("DEBUG: Token validation successful!");
        }

        console.log("DEBUG: Login successful. Credentials stored securely.");

        toast.style = Toast.Style.Success;
        toast.title = "Login successful!";

        pop();
      }
    } catch (error) {
      console.error("Login error:", error);
      const message = error instanceof Error ? error.message : "An unknown error occurred";
      setError(message);
      await showToast({
        style: Toast.Style.Failure,
        title: "Login failed",
        message: message,
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title={otpRequested ? "Login" : "Send Code"} onSubmit={handleSubmit} />
        </ActionPanel>
      }
      isLoading={isLoading}
    >
      <Form.TextField
        id="email"
        title="Email"
        placeholder="Enter your Ente email"
        error={error}
        onChange={() => setError(undefined)}
        autoFocus
      />
      {otpRequested && (
        <>
          <Form.PasswordField id="password" title="Password" placeholder="Enter your Ente password" />
          {!useSRP && <Form.TextField id="otp" title="Verification Code" placeholder="Enter code from email" />}
        </>
      )}
      <Form.Description
        text={
          otpRequested
            ? useSRP
              ? "Enter your password to authenticate with SRP."
              : "Enter your password and the verification code sent to your email."
            : "We'll check your authentication method and guide you through login."
        }
      />
    </Form>
  );
}
