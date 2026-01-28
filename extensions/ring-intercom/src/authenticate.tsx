import { Form, ActionPanel, Action, popToRoot, LocalStorage, Toast, showToast } from "@raycast/api";
import { useState, useEffect, useRef } from "react";
import { checkInternetConnection } from "./utils/connection";
import { RingApi } from "./api/ring-api";
import { RingAuthenticationError, TwoFactorError } from "./errors";
import { AuthState } from "./types";
import { LoginForm } from "./components/LoginForm";
import { TwoFactorForm } from "./components/TwoFactorForm";
import { validateForm } from "./utils/validation";
import { getOrCreateHardwareId, getSavedCredentials, saveCredentials, STORAGE_KEYS } from "./utils/storage";

const authService = {
  async validateToken(token: string) {
    if (!(await checkInternetConnection())) {
      throw new RingAuthenticationError("NETWORK_ERROR", "No Internet", "Please check your internet connection");
    }
    const ringApi = new RingApi({ refreshToken: token });
    await ringApi.getLocations();
  },

  async authenticate(email: string, password: string, twoFactorCode: string, hardwareId: string, tsvState?: string) {
    if (!(await checkInternetConnection())) {
      throw new RingAuthenticationError("NETWORK_ERROR", "No Internet", "Please check your internet connection");
    }
    const ringApi = new RingApi({ refreshToken: "" });
    return ringApi.authenticate(email, password, twoFactorCode, hardwareId, tsvState);
  },
};

const toastService = {
  async showError(error: unknown, isInitial = false) {
    if (error instanceof RingAuthenticationError) {
      const isNetworkError = error.code === "NETWORK_ERROR";
      const message = isNetworkError ? error.userMessage : isInitial ? "Please re-authenticate" : error.userMessage;
      const title = isNetworkError
        ? "No Internet"
        : error.message.toLowerCase().includes("verification code")
          ? "Invalid Code"
          : "Not Authenticated";

      await showToast({ style: Toast.Style.Failure, title, message });
    } else {
      await showToast({
        style: Toast.Style.Failure,
        title: "Error",
        message: error instanceof Error ? error.message : String(error),
      });
    }
  },

  auth: {
    async showRequired2FA() {
      await showToast({ style: Toast.Style.Animated, title: "2FA Required" });
    },
    async showAuthenticating() {
      await showToast({ style: Toast.Style.Animated, title: "Authenticating..." });
    },
    async showSuccess(message: string) {
      await showToast({ style: Toast.Style.Success, title: "Authenticated", message });
    },
  },
};

const handleTwoFactorSetup = (
  error: TwoFactorError,
  setAuthState: React.Dispatch<React.SetStateAction<AuthState>>,
  credentials?: { email?: string; password?: string },
) => {
  if (credentials?.email && credentials?.password) {
    saveCredentials(credentials.email, credentials.password);
  }

  const twoFactorPrompt =
    error.twoFactorType === "totp"
      ? "Enter the code from your authenticator app"
      : `Enter the code sent to ${error.phone ?? "your phone"} via SMS`;

  setAuthState((prev) => ({
    ...prev,
    twoFactorType: error.twoFactorType as "totp" | "sms",
    twoFactorPrompt,
    phone: error.phone,
    tsv_state: error.tsv_state,
    isLoading: false,
    twoFactorCode: "",
    twoFactorError: false,
    emailError: false,
    passwordError: false,
  }));
};

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
    tsv_state: undefined,
  });

  const twoFactorRef = useRef<Form.TextField>(null);
  const [hardwareId, setHardwareId] = useState<string>("");
  const [savedCredentials, setSavedCredentials] = useState<{ email?: string; password?: string }>({});

  useEffect(() => {
    if (authState.twoFactorType) {
      const timeoutId = setTimeout(() => twoFactorRef.current?.focus(), 100);
      return () => clearTimeout(timeoutId);
    }
  }, [authState.twoFactorType]);

  const handleSubmit = async () => {
    const emailToUse = authState.email || savedCredentials.email;
    const passwordToUse = authState.password || savedCredentials.password;

    const { hasError, errors } = validateForm(
      emailToUse,
      passwordToUse,
      authState.twoFactorType,
      authState.twoFactorCode,
    );

    if (hasError) {
      setAuthState((prev) => ({ ...prev, ...errors }));
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
      if (!emailToUse || !passwordToUse) {
        await toastService.showError(new Error("No credentials available"));
        return;
      }

      await toastService.auth.showAuthenticating();

      const token = await authService.authenticate(
        emailToUse,
        passwordToUse,
        authState.twoFactorCode,
        hardwareId,
        authState.tsv_state,
      );

      if (token) {
        await authService.validateToken(token);
        await LocalStorage.setItem(STORAGE_KEYS.REFRESH_TOKEN, token);
        await toastService.auth.showSuccess("");
        await popToRoot();
      }
    } catch (error) {
      if (error instanceof TwoFactorError) {
        await toastService.auth.showRequired2FA();
        handleTwoFactorSetup(error, setAuthState, { email: emailToUse, password: passwordToUse });
        return;
      }
      await toastService.showError(error);
    } finally {
      setAuthState((prev) => ({ ...prev, isLoading: false }));
    }
  };

  useEffect(() => {
    async function initializeAuth() {
      try {
        const [credentials, id, existingToken] = await Promise.all([
          getSavedCredentials(),
          getOrCreateHardwareId(),
          LocalStorage.getItem<string>(STORAGE_KEYS.REFRESH_TOKEN),
        ]);

        setSavedCredentials(credentials);
        setHardwareId(id);
        setAuthState((prev) => ({ ...prev, isLoading: false }));

        if (existingToken) {
          await authService.validateToken(existingToken);
          await toastService.auth.showSuccess("No need to re-authenticate");
        }
      } catch (error) {
        console.error("Initialization failed:", error);
        setAuthState((prev) => ({ ...prev, isLoading: false }));
        await toastService.showError(error, true);
      }
    }

    initializeAuth();
  }, []);

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
