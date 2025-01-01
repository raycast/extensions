import { Form, ActionPanel, Action, popToRoot, LocalStorage, Toast, showToast } from "@raycast/api";
import { randomBytes } from "crypto";
import fetch from "cross-fetch";
import { useState, useEffect, useRef } from "react";
import { checkInternetConnection } from "./utils";

// Function to generate hardware ID using crypto
const generateHardwareId = () => {
  return randomBytes(16).toString("hex");
};

// Function to get or create hardware ID
const getOrCreateHardwareId = async () => {
  const storedId = await LocalStorage.getItem<string>("RING_HARDWARE_ID");
  if (storedId) {
    return storedId;
  }
  const newId = generateHardwareId();
  await LocalStorage.setItem("RING_HARDWARE_ID", newId);
  return newId;
};

// Global validation flag to prevent concurrent token checks
let isTokenValidating = false;

class RingApi {
  private readonly validationId: string;
  private readonly TIMEOUT_MS = 5000;

  constructor(private readonly config: { refreshToken: string; debug?: boolean }) {
    this.validationId = Math.random().toString(36).substring(2, 9);
  }

  private async fetchWithTimeout(url: string, options: RequestInit): Promise<Response> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.TIMEOUT_MS);

    try {
      const response = await fetch(url, {
        ...options,
        signal: controller.signal,
      });
      return response;
    } finally {
      clearTimeout(timeoutId);
    }
  }

  async getLocations() {
    try {
      console.debug("Getting access token using refresh token");

      const tokenResponse = await this.fetchWithTimeout("https://oauth.ring.com/oauth/token", {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          Accept: "application/json",
          "User-Agent": "android:com.ringapp",
          "2fa-support": "true",
        },
        body: new URLSearchParams({
          grant_type: "refresh_token",
          refresh_token: this.config.refreshToken,
          client_id: "ring_official_android",
          scope: "client",
        }).toString(),
      });

      if (!tokenResponse.ok) {
        const responseText = await tokenResponse.json();
        if (tokenResponse.status === 401 || tokenResponse.status === 403) {
          throw new Error(`Authentication failed: ${tokenResponse.status} - ${responseText}`);
        }
        throw new Error(`Network error: ${tokenResponse.status} - ${responseText}`);
      }

      const { access_token } = await tokenResponse.json();
      console.debug("Successfully obtained access token");

      console.debug("Validating access token by fetching locations");
      const locationsResponse = await this.fetchWithTimeout("https://api.ring.com/clients_api/ring_devices", {
        headers: {
          Authorization: `Bearer ${access_token}`,
          "Content-Type": "application/json",
          Accept: "application/json",
          "User-Agent": "android:com.ringapp",
        },
      });

      if (!locationsResponse.ok) {
        const errorData = await locationsResponse.text();
        if (locationsResponse.status === 401 || locationsResponse.status === 403) {
          throw new Error(`Authentication failed: ${locationsResponse.status} - ${errorData}`);
        }
        throw new Error(`Request failed: ${locationsResponse.status} - ${errorData}`);
      }

      console.debug("Validation completed successfully");
      const locations = await locationsResponse.json();

      await showToast({
        style: Toast.Style.Success,
        title: "Already Authenticated",
        message: "No need to re-authenticate",
      });

      return locations;
    } catch (error) {
      console.error("Error during validation:", error);
      throw error;
    }
  }
}

class TwoFactorError extends Error {
  type: string;
  twoFactorType: string;
  phone?: string;

  constructor(twoFactorType: string, phone?: string) {
    super("Two-factor authentication required");
    this.type = "TwoFactorRequired";
    this.twoFactorType = twoFactorType;
    this.phone = phone;
    Object.setPrototypeOf(this, TwoFactorError.prototype);
  }
}

async function getAuthToken(
  email: string,
  password: string,
  twoFactorCode: string,
  hardwareId: string,
): Promise<string> {
  const params = new URLSearchParams({
    client_id: "ring_official_android",
    scope: "client",
    grant_type: "password",
    username: email,
    password: password,
  });

  const headers: { [key: string]: string } = {
    "content-type": "application/x-www-form-urlencoded",
    "2fa-support": "true",
    hardware_id: hardwareId,
    "User-Agent": "android:com.ringapp",
    Accept: "application/json",
  };

  if (twoFactorCode) {
    headers["2fa-code"] = twoFactorCode;
  }

  const response = await fetch("https://oauth.ring.com/oauth/token", {
    method: "POST",
    headers: headers,
    body: params.toString(),
  });

  const data = await response.text();
  const parsedData = JSON.parse(data);

  if (parsedData.error) {
    if (parsedData.error === "access_denied" && parsedData.error_description === "invalid user credentials") {
      throw new Error("Invalid email or password");
    }
    throw new Error(parsedData.error_description || parsedData.error);
  } else if (parsedData.tsv_state) {
    throw new TwoFactorError(parsedData.tsv_state, parsedData.phone);
  }
  return parsedData.refresh_token;
}

interface AuthState {
  email: string;
  password: string;
  twoFactorCode: string;
  isLoading: boolean;
  twoFactorType: "totp" | "sms" | null;
  twoFactorPrompt: string;
  phone?: string;
  emailError: boolean;
  emailFormatError: string | undefined;
  passwordError: boolean;
  twoFactorError: boolean;
  twoFactorNumericError: string | undefined;
  twoFactorWarning?: string;
}

export default function Command() {
  const [authState, setAuthState] = useState<AuthState>({
    email: "",
    password: "",
    twoFactorCode: "",
    isLoading: true,
    twoFactorType: null,
    twoFactorPrompt: "",
    emailError: false,
    emailFormatError: undefined,
    passwordError: false,
    twoFactorError: false,
    twoFactorNumericError: undefined,
    twoFactorWarning: undefined,
  });

  const twoFactorRef = useRef<Form.TextField>(null);

  useEffect(() => {
    if (authState.twoFactorType) {
      const timeoutId = setTimeout(() => twoFactorRef.current?.focus(), 100);
      return () => clearTimeout(timeoutId);
    }
  }, [authState.twoFactorType]);

  const [hardwareId, setHardwareId] = useState<string>("");
  const isLoadingRef = useRef(false);

  useEffect(() => {
    const loadInitialState = async () => {
      if (isLoadingRef.current) return;
      isLoadingRef.current = true;

      const [id, savedEmail, savedPassword] = await Promise.all([
        getOrCreateHardwareId(),
        LocalStorage.getItem<string>("RING_EMAIL"),
        LocalStorage.getItem<string>("RING_PASSWORD"),
      ]);

      setHardwareId(id);
      setAuthState((prev) => ({
        ...prev,
        email: savedEmail ?? "",
        password: savedPassword ?? "",
        isLoading: false,
      }));

      isLoadingRef.current = false;
    };

    loadInitialState();
  }, []);

  useEffect(() => {
    async function validateExistingToken() {
      if (isTokenValidating) return;
      isTokenValidating = true;

      console.debug("Starting token validation");

      const existingToken = await LocalStorage.getItem<string>("RING_REFRESH_TOKEN");

      if (!existingToken) {
        console.debug("No existing token found");
        isTokenValidating = false;
        return;
      }

      try {
        if (!(await checkInternetConnection())) {
          console.warn("Internet connection check failed");
          await showToast({
            style: Toast.Style.Failure,
            title: "No Internet",
            message: "Please check your internet connection",
          });
          return;
        }

        console.debug("Attempting to validate existing token");
        const ringApi = new RingApi({
          refreshToken: existingToken,
          debug: false,
        });

        await ringApi.getLocations();
      } catch (error) {
        console.error("Token validation failed", error);

        if (error instanceof Error && error.message.includes("Authentication failed")) {
          await LocalStorage.removeItem("RING_REFRESH_TOKEN");
          console.debug("Removed invalid token from storage");
          await showToast({
            style: Toast.Style.Failure,
            title: "Authentication Failed",
            message: "Please log in again.",
          });
        } else {
          await showToast({
            style: Toast.Style.Failure,
            title: "Error",
            message: error instanceof Error ? error.message : String(error),
          });
        }
      } finally {
        isTokenValidating = false;
      }
    }

    validateExistingToken();
  }, []);

  async function handleSubmit() {
    console.debug(`Starting submission: 2FA: ${!!authState.twoFactorType}, type: ${authState.twoFactorType}`);

    let hasError = false;

    if (!authState.email) {
      setAuthState((prev) => ({ ...prev, emailError: true }));
      hasError = true;
    } else {
      // Email format validation
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(authState.email)) {
        setAuthState((prev) => ({
          ...prev,
          emailError: false,
          emailFormatError: "Please enter a valid email address",
        }));
        hasError = true;
      }
    }

    if (!authState.password) {
      setAuthState((prev) => ({ ...prev, passwordError: true }));
      hasError = true;
    }

    if (authState.twoFactorType && !authState.twoFactorCode) {
      setAuthState((prev) => ({ ...prev, twoFactorError: true }));
      hasError = true;
    }

    if (authState.twoFactorType && authState.twoFactorCode.length < 6) {
      setAuthState((prev) => ({
        ...prev,
        twoFactorError: false,
        twoFactorNumericError: "Code Must be 6 Digits",
      }));
      hasError = true;
    }

    if (hasError) {
      console.warn("Form validation failed");
      return;
    }

    setAuthState((prev) => ({
      ...prev,
      isLoading: true,
      emailError: false,
      passwordError: false,
      twoFactorError: false,
    }));

    try {
      console.debug("Attempting authentication");
      const token = await getAuthToken(authState.email, authState.password, authState.twoFactorCode, hardwareId);

      console.debug("Token obtained, saving to storage");
      await LocalStorage.setItem("RING_REFRESH_TOKEN", token);

      if (token) {
        console.debug("Verifying token with API");
        const ringApi = new RingApi({ refreshToken: token });
        await ringApi.getLocations();

        await showToast({
          style: Toast.Style.Success,
          title: "Authentication Successful!",
        });
        await popToRoot();
      }
    } catch (error: unknown) {
      console.error("Authentication failed", error);

      if (error instanceof TwoFactorError) {
        console.debug("2FA required, saving credentials");
        await LocalStorage.setItem("RING_EMAIL", authState.email);
        await LocalStorage.setItem("RING_PASSWORD", authState.password);

        const twoFactorPrompt =
          error.twoFactorType === "totp"
            ? "Enter the code from your authenticator app"
            : `Enter the code sent to ${error.phone ?? "your phone"} via SMS`;

        await showToast({
          style: Toast.Style.Animated,
          title: "2FA Required",
          message: "Please enter your verification code",
        });

        setAuthState((prev) => ({
          ...prev,
          twoFactorType: error.twoFactorType as "totp" | "sms",
          twoFactorPrompt,
          phone: error.phone,
          isLoading: false,
          twoFactorCode: "",
          twoFactorError: false,
          emailError: false,
          passwordError: false,
        }));
        return;
      }

      await showToast({
        style: Toast.Style.Failure,
        title: "Authentication Failed",
        message: error instanceof Error ? error.message : String(error),
      });
    } finally {
      setAuthState((prev) => ({ ...prev, isLoading: false }));
    }
  }

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title={authState.twoFactorType ? "Submit Code" : "Authenticate"} onSubmit={handleSubmit} />
        </ActionPanel>
      }
      navigationTitle={authState.twoFactorType ? "Enter 2FA Code" : "Ring Authentication"}
    >
      {!authState.isLoading && !authState.twoFactorType && (
        <>
          <Form.TextField
            id="email"
            title="Email"
            defaultValue={authState.email}
            placeholder="Enter your Ring account email"
            error={authState.emailError ? "Email is Required" : authState.emailFormatError}
            onChange={(newEmail) =>
              setAuthState((prev) => ({
                ...prev,
                email: newEmail,
                emailError: false,
                emailFormatError: undefined,
              }))
            }
          />
          <Form.PasswordField
            id="password"
            title="Password"
            defaultValue={authState.password}
            placeholder="Enter your Ring account password"
            error={authState.passwordError ? "Password is Required" : undefined}
            onChange={(newPassword) =>
              setAuthState((prev) => ({
                ...prev,
                password: newPassword,
                passwordError: false,
              }))
            }
          />
        </>
      )}
      {authState.twoFactorType && (
        <>
          <Form.TextField
            id="twoFactorCode"
            title="2FA Code"
            ref={twoFactorRef}
            placeholder={authState.twoFactorPrompt}
            value={authState.twoFactorCode}
            autoFocus
            error={
              authState.twoFactorError
                ? "Code is Required"
                : authState.twoFactorNumericError
                  ? authState.twoFactorNumericError
                  : undefined
            }
            onChange={(newInput) => {
              // Strip out any non-numeric characters
              const numericOnly = newInput.replace(/\D/g, "");

              // Check if input was pasted (length > 1) and contained non-numeric characters
              const hasNonNumeric = /[^0-9]/.test(newInput);
              const isPaste = newInput.length > 1;
              const isTooLong = numericOnly.length > 6;

              // Check if the last character entered was non-numeric
              const lastCharIsNonNumeric = newInput.length > 0 && /[^0-9]/.test(newInput[newInput.length - 1]);

              setAuthState((prev) => ({
                ...prev,
                twoFactorCode: numericOnly.slice(0, 6), // Limit to 6 digits after validation
                twoFactorError: false,
                twoFactorNumericError: isTooLong
                  ? "Max 6 Digits"
                  : lastCharIsNonNumeric
                    ? "Only Numbers Allowed"
                    : undefined,
                twoFactorWarning:
                  isPaste && hasNonNumeric && numericOnly.length > 0
                    ? "Non-numeric characters have been removed"
                    : undefined,
              }));
            }}
          />
          {authState.twoFactorWarning && <Form.Description text={authState.twoFactorWarning} />}
        </>
      )}
    </Form>
  );
}
