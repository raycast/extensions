import { Form, ActionPanel, Action, popToRoot, LocalStorage, Toast, showToast } from "@raycast/api";
import { randomBytes } from "crypto";
import fetch from "cross-fetch";
import { useState, useEffect, useRef } from "react";
import { checkInternetConnection } from "./utils";

class RingAuthenticationError extends Error {
  public code: "NETWORK_ERROR" | "INVALID_CREDENTIALS";
  public userMessage: string;

  constructor(code: "NETWORK_ERROR" | "INVALID_CREDENTIALS", message: string, userMessage: string) {
    super(message);
    this.code = code;
    this.userMessage = userMessage;
    Object.setPrototypeOf(this, RingAuthenticationError.prototype);
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

const getOrCreateHardwareId = async () => {
  const storedId = await LocalStorage.getItem<string>("RING_HARDWARE_ID");
  if (storedId) {
    return storedId;
  }
  const newId = randomBytes(16).toString("hex");
  await LocalStorage.setItem("RING_HARDWARE_ID", newId);
  return newId;
};

interface TokenResponse {
  access_token?: string;
  refresh_token?: string;
  error?: string;
  error_description?: string;
  tsv_state?: string;
  phone?: string;
}

interface LocationsResponse {
  status?: number;
  error?: string;
}

class RingApi {
  private readonly TIMEOUT_MS = 5000;
  private readonly BASE_URL = "https://oauth.ring.com/oauth/token";

  private readonly ERROR_MESSAGES: Record<number, string> = {
    404: "Ring service endpoint not found. Please try again later.",
    401: "Authentication token expired. Please log in again.",
    403: "Access denied. Please check your credentials.",
    429: "Too many requests. Please try again in a few minutes.",
    ...Object.fromEntries(
      [500, 502, 503, 504].map((code) => [code, "Ring servers are currently unavailable. Please try again later."]),
    ),
  } as const;

  constructor(private readonly config: { refreshToken: string }) {}

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

  private async parseJsonResponse<T>(response: Response, context: string): Promise<T> {
    try {
      const data = await response.json();
      return data as T;
    } catch (e) {
      throw new RingAuthenticationError(
        "NETWORK_ERROR",
        `Invalid response from Ring server (${context}): ${e instanceof Error ? e.message : String(e)}`,
        "Received invalid response from Ring servers. Please try again.",
      );
    }
  }

  private getBaseHeaders(): Record<string, string> {
    return {
      "Content-Type": "application/x-www-form-urlencoded",
      Accept: "application/json",
      "User-Agent": "android:com.ringapp",
      "2fa-support": "true",
    };
  }

  async getLocations() {
    try {
      console.debug("Getting access token using refresh token");

      const tokenResponse = await this.fetchWithTimeout(this.BASE_URL, {
        method: "POST",
        headers: this.getBaseHeaders(),
        body: new URLSearchParams({
          grant_type: "refresh_token",
          refresh_token: this.config.refreshToken,
          client_id: "ring_official_android",
          scope: "client",
        }).toString(),
      });

      const responseText = await this.parseJsonResponse<TokenResponse>(tokenResponse, "token");

      if (!tokenResponse.ok) {
        const message = this.getErrorMessageForStatus(tokenResponse.status);
        throw new RingAuthenticationError(
          "NETWORK_ERROR",
          `Network error: ${tokenResponse.status} - ${JSON.stringify(responseText)}`,
          message,
        );
      }

      const { access_token } = responseText;
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

      const locations = await this.parseJsonResponse<LocationsResponse>(locationsResponse, "locations");

      if (!locationsResponse.ok) {
        const message = this.getErrorMessageForStatus(locationsResponse.status);
        throw new RingAuthenticationError(
          "NETWORK_ERROR",
          `Request failed: ${locationsResponse.status} - ${JSON.stringify(locations)}`,
          message,
        );
      }

      console.debug("Validation completed successfully");
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

  async authenticate(email: string, password: string, twoFactorCode: string, hardwareId: string): Promise<string> {
    const response = await this.fetchWithTimeout(this.BASE_URL, {
      method: "POST",
      headers: {
        ...this.getBaseHeaders(),
        hardware_id: hardwareId,
        ...(twoFactorCode && { "2fa-code": twoFactorCode }),
      },
      body: new URLSearchParams({
        client_id: "ring_official_android",
        scope: "client",
        grant_type: "password",
        username: email,
        password: password,
      }).toString(),
    });

    const data = await response.text();
    console.debug("Ring API Response:", data);
    const parsedData = JSON.parse(data);

    if (parsedData?.error) {
      console.debug("Error details:", {
        error: parsedData.error,
        description: parsedData?.error_description,
      });

      const errorMessage =
        parsedData.error === "access_denied" && parsedData?.error_description === "invalid user credentials"
          ? "Please check your email and password."
          : parsedData?.error_description?.toLowerCase()?.includes("verification code")
            ? "Invalid verification code. Please try again."
            : parsedData.error?.toLowerCase()?.includes("too many requests")
              ? "Too many attempts. Please try again in a few minutes."
              : (parsedData?.error_description ?? parsedData.error ?? "An authentication error occurred.");

      throw new RingAuthenticationError(
        "INVALID_CREDENTIALS",
        parsedData?.error_description ?? parsedData.error,
        errorMessage,
      );
    } else if (parsedData?.tsv_state) {
      throw new TwoFactorError(parsedData.tsv_state, parsedData?.phone);
    }

    return parsedData.refresh_token;
  }

  private getErrorMessageForStatus(status: number): string {
    return this.ERROR_MESSAGES[status] ?? "Unable to reach Ring servers.";
  }
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

function sanitizeTwoFactorCode(
  input: string,
  prevInput: string,
): {
  code: string;
  numericError?: string;
  warning?: string;
} {
  const numericOnly = input.replace(/\D/g, "");

  const isPaste = input.length > prevInput.length + 2;
  const hasNonNumeric = /\D/.test(input);
  const isTooLong = numericOnly.length > 6;
  const lastCharIsNonNumeric = input.length > 0 && /\D/.test(input[input.length - 1]);

  return {
    code: numericOnly.slice(0, 6),
    numericError: isTooLong ? "6 digits max" : lastCharIsNonNumeric ? "Only numbers allowed" : undefined,
    // Only show warning for paste operations where characters were removed
    warning:
      isPaste && hasNonNumeric && numericOnly.length > 0 ? "Non-numeric characters have been removed" : undefined,
  };
}

function LoginForm({
  authState,
  setAuthState,
  savedCredentials,
}: {
  authState: AuthState;
  setAuthState: React.Dispatch<React.SetStateAction<AuthState>>;
  savedCredentials: { email?: string; password?: string };
}) {
  return (
    <>
      <Form.TextField
        id="email"
        title="Email"
        value={authState.email}
        placeholder={savedCredentials.email || "Enter your Ring account email"}
        error={authState.emailError ? "Email is required" : authState.emailFormatError}
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
        value={authState.password}
        placeholder={
          savedCredentials.password ? "•".repeat(savedCredentials.password.length) : "Enter your Ring account password"
        }
        error={authState.passwordError ? "Password is required" : undefined}
        onChange={(newPassword) =>
          setAuthState((prev) => ({
            ...prev,
            password: newPassword,
            passwordError: false,
          }))
        }
      />
    </>
  );
}

function TwoFactorForm({
  authState,
  setAuthState,
  twoFactorRef,
}: {
  authState: AuthState;
  setAuthState: React.Dispatch<React.SetStateAction<AuthState>>;
  twoFactorRef: React.RefObject<Form.TextField>;
}) {
  return (
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
            ? "Code is required"
            : authState.twoFactorNumericError
              ? authState.twoFactorNumericError
              : undefined
        }
        onChange={(newInput) => {
          const { code, numericError, warning } = sanitizeTwoFactorCode(newInput, authState.twoFactorCode);

          setAuthState((prev) => ({
            ...prev,
            twoFactorCode: code,
            twoFactorError: false,
            twoFactorNumericError: numericError,
            twoFactorWarning: warning,
          }));

          if (numericError === "6 digits max" || (code.length === 6 && numericError === "Only numbers allowed")) {
            setTimeout(() => {
              setAuthState((prev) => ({
                ...prev,
                twoFactorNumericError: undefined,
              }));
            }, 1000);
          }
        }}
      />
      {authState.twoFactorWarning && <Form.Description text={authState.twoFactorWarning} />}
    </>
  );
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

  // For storing or creating the hardware ID
  const [hardwareId, setHardwareId] = useState<string>("");

  // Potentially saved credentials from LocalStorage
  const [savedCredentials, setSavedCredentials] = useState<{ email?: string; password?: string }>({});

  // Focus on 2FA input if 2FA is required
  useEffect(() => {
    if (authState.twoFactorType) {
      const timeoutId = setTimeout(() => twoFactorRef.current?.focus(), 100);
      return () => clearTimeout(timeoutId);
    }
  }, [authState.twoFactorType]);

  const initializeAuth = async () => {
    console.debug("Starting authentication initialization");

    const [savedEmail, savedPassword] = await Promise.all([
      LocalStorage.getItem<string>("RING_EMAIL"),
      LocalStorage.getItem<string>("RING_PASSWORD"),
    ]);
    setSavedCredentials({ email: savedEmail ?? "", password: savedPassword ?? "" });
    setAuthState((prev) => ({ ...prev, isLoading: false }));

    const id = await getOrCreateHardwareId();
    setHardwareId(id);

    await validateExistingToken();
  };

  const validateExistingToken = async () => {
    const existingToken = await LocalStorage.getItem<string>("RING_REFRESH_TOKEN");
    if (!existingToken) return;

    try {
      if (!(await checkInternetConnection())) {
        throw new Error("No internet connection");
      }

      console.debug("Attempting to validate existing token");
      const ringApi = new RingApi({ refreshToken: existingToken });
      await ringApi.getLocations();
    } catch (error) {
      handleTokenValidationError(error);
    }
  };

  const handleTokenValidationError = async (error: unknown) => {
    console.error("Token validation failed", error);

    if (error instanceof RingAuthenticationError) {
      if (error.code === "INVALID_CREDENTIALS") {
        await LocalStorage.removeItem("RING_REFRESH_TOKEN");
      }
      await showToast({
        style: Toast.Style.Failure,
        title: error.code === "NETWORK_ERROR" ? "Connection Error" : "Authentication Failed",
        message: error.userMessage || "Please log in again.",
      });
    } else {
      await showToast({
        style: Toast.Style.Failure,
        title: "Error",
        message: error instanceof Error ? error.message : String(error),
      });
    }
  };

  useEffect(() => {
    initializeAuth();
  }, []);

  const handleSubmit = async () => {
    console.debug(`Starting submission: 2FA: ${!!authState.twoFactorType}, type: ${authState.twoFactorType}`);

    const emailToUse = authState.email || savedCredentials.email;
    const passwordToUse = authState.password || savedCredentials.password;

    const { hasError, errors } = validateForm(
      emailToUse,
      passwordToUse,
      authState.twoFactorType,
      authState.twoFactorCode,
    );

    if (hasError) {
      setAuthState((prev) => ({
        ...prev,
        ...errors,
      }));
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
      if (!(await checkInternetConnection())) {
        console.warn("Internet connection check failed");
        await showToast({
          style: Toast.Style.Failure,
          title: "No Internet",
          message: "Please check your internet connection",
        });
        return;
      }

      // Show authenticating toast for both initial login and 2FA
      await showToast({
        style: Toast.Style.Animated,
        title: "Authenticating...",
      });

      console.debug("Attempting authentication");

      if (!emailToUse || !passwordToUse) {
        await showToast({
          style: Toast.Style.Failure,
          title: "Authentication Failed",
          message: "No credentials available",
        });
        return;
      }

      const ringApi = new RingApi({ refreshToken: "" });
      const token = await ringApi.authenticate(emailToUse, passwordToUse, authState.twoFactorCode, hardwareId);

      if (token) {
        console.debug("Verifying token with API");
        const ringApi = new RingApi({ refreshToken: token });
        await ringApi.getLocations();

        // Save both the token and the credentials that worked
        await LocalStorage.setItem("RING_REFRESH_TOKEN", token);

        await showToast({
          style: Toast.Style.Success,
          title: "Authentication Successful!",
          message: "",
        });
        await popToRoot();
      }
    } catch (error: unknown) {
      console.error("Authentication failed", error);

      // Handle 2FA error specifically
      if (error instanceof TwoFactorError) {
        console.debug("2FA required");

        // Save credentials immediately since they're valid
        if (emailToUse && passwordToUse) {
          await LocalStorage.setItem("RING_EMAIL", emailToUse as string);
          await LocalStorage.setItem("RING_PASSWORD", passwordToUse as string);
          console.debug("Saved valid credentials");
        }

        const twoFactorPrompt =
          error.twoFactorType === "totp"
            ? "Enter the code from your authenticator app"
            : error.phone
              ? `Enter the code sent to ${error.phone} via SMS`
              : "Enter the code sent to your phone via SMS";

        await showToast({
          style: Toast.Style.Animated,
          title: "2FA Required",
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

      // Handle all other errors with a single error handler
      await showToast({
        style: Toast.Style.Failure,
        title: "Authentication Failed",
        message:
          error instanceof RingAuthenticationError
            ? error.userMessage
            : error instanceof Error
              ? error.message
              : String(error),
      });
    } finally {
      setAuthState((prev) => ({ ...prev, isLoading: false }));
    }
  };

  // Rendering
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
        <LoginForm authState={authState} setAuthState={setAuthState} savedCredentials={savedCredentials} />
      )}
      {authState.twoFactorType && (
        <TwoFactorForm authState={authState} setAuthState={setAuthState} twoFactorRef={twoFactorRef} />
      )}
    </Form>
  );
}

function validateForm(
  email: string | undefined,
  password: string | undefined,
  twoFactorType: string | null,
  twoFactorCode: string,
): { hasError: boolean; errors: Partial<AuthState> } {
  const errors: Partial<AuthState> = {};
  let hasError = false;

  // Email validation
  if (!email) {
    errors.emailError = true;
    hasError = true;
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    errors.emailFormatError = "Please enter a valid email";
    hasError = true;
  }

  // Password validation
  if (!password) {
    errors.passwordError = true;
    hasError = true;
  }

  // 2FA validation
  if (twoFactorType) {
    if (!twoFactorCode) {
      errors.twoFactorError = true;
      hasError = true;
    } else if (twoFactorCode.length < 6) {
      errors.twoFactorNumericError = "Code must be 6 digits";
      hasError = true;
    }
  }

  return { hasError, errors };
}
