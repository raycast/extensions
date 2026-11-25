import { Form, ActionPanel, Action, popToRoot, LocalStorage, Toast, showToast } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import { useState, useEffect, useRef } from "react";
import { RingApi } from "./api/ring-api";
import { RingAuthenticationError, TwoFactorError } from "./errors";
import { AuthState } from "./types";
import { LoginForm } from "./components/LoginForm";
import { TwoFactorForm } from "./components/TwoFactorForm";
import { validateForm } from "./utils/validation";
import { getOrCreateHardwareId, getSavedEmail, removeSavedPassword, saveEmail, STORAGE_KEYS } from "./utils/storage";

const authService = {
  async validateToken(token: string) {
    const ringApi = new RingApi({ refreshToken: token });
    await ringApi.getIntercoms();
  },

  async authenticate(email: string, password: string, twoFactorCode: string, hardwareId: string) {
    const ringApi = new RingApi({ refreshToken: "" });
    return ringApi.authenticate(email, password, twoFactorCode, hardwareId);
  },
};

const toastService = {
  async showError(error: unknown, isInitial = false) {
    if (error instanceof RingAuthenticationError) {
      const isNetworkError = error.code === "NETWORK_ERROR";
      const message = isNetworkError ? error.userMessage : isInitial ? "Please re-authenticate" : error.userMessage;
      const title = isNetworkError
        ? "Can't Reach Ring"
        : error.message.toLowerCase().includes("verification code")
          ? "Invalid Code"
          : "Not Authenticated";

      await showFailureToast(error, { title, message });
    } else {
      await showFailureToast(error, { title: "Error" });
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

function twoFactorPromptFor(error: TwoFactorError) {
  if (error.twoFactorType === "totp") {
    return "Enter the code from your authenticator app";
  }
  if (error.twoFactorType === "email") {
    return "Enter the code Ring emailed you";
  }
  return `Enter the code sent to ${error.phone ?? "your phone"} via SMS`;
}

const handleTwoFactorSetup = (
  error: TwoFactorError,
  setAuthState: React.Dispatch<React.SetStateAction<AuthState>>,
  email?: string,
) => {
  if (email) {
    saveEmail(email);
  }

  setAuthState((prev) => ({
    ...prev,
    twoFactorType: error.twoFactorType,
    twoFactorPrompt: twoFactorPromptFor(error),
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
  const [savedEmail, setSavedEmail] = useState<string>();

  useEffect(() => {
    if (authState.twoFactorType) {
      const timeoutId = setTimeout(() => twoFactorRef.current?.focus(), 100);
      return () => clearTimeout(timeoutId);
    }
  }, [authState.twoFactorType]);

  const handleSubmit = async () => {
    const emailToUse = authState.email || savedEmail;
    // The password is kept only in this form, for the 2FA step. It is never saved.
    const passwordToUse = authState.password;

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

      const token = await authService.authenticate(emailToUse, passwordToUse, authState.twoFactorCode, hardwareId);

      // Ring just issued this token, so the sign-in is complete. It used to be checked with a token refresh and then
      // saved, which put back the token that refresh had just replaced.
      await LocalStorage.setItem(STORAGE_KEYS.REFRESH_TOKEN, token);
      await saveEmail(emailToUse);
      await toastService.auth.showSuccess("");
      await popToRoot();
    } catch (error) {
      if (error instanceof TwoFactorError) {
        await toastService.auth.showRequired2FA();
        handleTwoFactorSetup(error, setAuthState, emailToUse);
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
        const [email, id, existingToken] = await Promise.all([
          getSavedEmail(),
          getOrCreateHardwareId(),
          LocalStorage.getItem<string>(STORAGE_KEYS.REFRESH_TOKEN),
          // Earlier versions saved the password. Remove it, also for someone who isn't signed in.
          removeSavedPassword(),
        ]);

        setSavedEmail(email);
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
        <LoginForm authState={authState} setAuthState={setAuthState} savedEmail={savedEmail} />
      )}
      {authState.twoFactorType && (
        <TwoFactorForm authState={authState} setAuthState={setAuthState} twoFactorRef={twoFactorRef} />
      )}
    </Form>
  );
}
