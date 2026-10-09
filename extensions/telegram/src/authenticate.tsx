import { useState, useEffect, useCallback, useRef } from "react";
import {
  Form,
  Detail,
  ActionPanel,
  Action,
  popToRoot,
  Icon,
  openExtensionPreferences,
  showToast,
  Toast,
} from "@raycast/api";
import { useForm, FormValidation } from "@raycast/utils";
import dedent from "dedent";
import { handleQrAuthFlow, handlePasswordAuthFlow, handleLogOut, getConfig } from "./utils/auth";
import { isAuthenticated } from "./services/telegram-client";

interface AuthPasswordFormValues {
  password: string;
}

export default function Authenticate() {
  const [authStep, setAuthStep] = useState<"authenticated" | "qr" | "password" | "setup">("qr");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [qrInfo, setQrInfo] = useState<{ tgUrl: string; dataUrl: string } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  const passwordForm = useForm<AuthPasswordFormValues>({
    onSubmit: async (values) => {
      setIsSubmitting(true);
      try {
        const success = await handlePasswordAuthFlow(values.password);
        if (success) {
          await popToRoot();
        }
      } catch {
        // Toast handled in handlePasswordAuthFlow
      } finally {
        setIsSubmitting(false);
      }
    },
    validation: {
      password: FormValidation.Required,
    },
  });

  const startQrAuth = useCallback(async (options?: { silentConfigError?: boolean }) => {
    try {
      getConfig();
    } catch (err) {
      setAuthStep("setup");
      if (!options?.silentConfigError) {
        await showToast({
          style: Toast.Style.Failure,
          title: "Configuration Error",
          message: err instanceof Error ? err.message : "Please check your preferences",
        });
      }
      return;
    }

    abortControllerRef.current?.abort();
    const controller = new AbortController();
    abortControllerRef.current = controller;
    setQrInfo(null);
    setError(null);
    setIsSubmitting(true);
    setAuthStep("qr");

    try {
      const result = await handleQrAuthFlow({
        onQrCode: (data) => {
          if (controller.signal.aborted) return;
          setQrInfo(data);
          setIsSubmitting(false);
        },
        abortSignal: controller.signal,
      });

      if (controller.signal.aborted) {
        return;
      }

      if (result.success) {
        await popToRoot();
      } else if (result.needsPassword) {
        setAuthStep("password");
      }
    } catch (err) {
      if (controller.signal.aborted) return;
      setError(err instanceof Error ? err.message : "Failed to generate QR code");
    } finally {
      setIsSubmitting(false);
    }
  }, []);

  useEffect(() => {
    async function checkAuth() {
      try {
        getConfig();
      } catch {
        setAuthStep("setup");
        return;
      }

      if (await isAuthenticated()) {
        setAuthStep("authenticated");
        return;
      }

      startQrAuth({ silentConfigError: true });
    }

    checkAuth();

    return () => {
      abortControllerRef.current?.abort();
    };
  }, [startQrAuth]);

  if (authStep === "authenticated") {
    return (
      <Detail
        isLoading={isSubmitting}
        markdown={dedent`
          # Already Authenticated

          You are currently signed in to your Telegram account.

          To disconnect this session or sign in with a different account, click **Log Out** below.
        `}
        actions={
          <ActionPanel>
            <Action
              title="Log out"
              icon={Icon.Logout}
              style={Action.Style.Destructive}
              onAction={async () => {
                setIsSubmitting(true);
                await handleLogOut();
                setIsSubmitting(false);
                setAuthStep("qr");
                startQrAuth();
              }}
            />
            <Action title="Back to Raycast" icon={Icon.ArrowLeft} onAction={popToRoot} />
            <Action
              title="Open Extension Preferences"
              icon={Icon.Gear}
              shortcut={{ modifiers: ["cmd"], key: "," }}
              onAction={openExtensionPreferences}
            />
          </ActionPanel>
        }
      />
    );
  }

  if (authStep === "setup") {
    return (
      <Form
        isLoading={isSubmitting}
        actions={
          <ActionPanel>
            <Action.SubmitForm icon={Icon.ArrowRight} title="Log in" onSubmit={() => startQrAuth()} />
            <Action
              title="Open Extension Preferences"
              icon={Icon.Gear}
              shortcut={{ modifiers: ["cmd"], key: "," }}
              onAction={openExtensionPreferences}
            />
            <Action.OpenInBrowser
              title="Get API Credentials"
              url="https://my.telegram.org/apps"
              shortcut={{ modifiers: ["cmd"], key: "o" }}
            />
          </ActionPanel>
        }
      >
        <Form.Description
          title="Setup Required"
          text="Before authenticating, configure your Telegram API credentials in extension preferences (⌘+,)."
        />
        <Form.Separator />
        <Form.Description
          title="How to Get API Credentials"
          text={dedent`
            1. Visit https://my.telegram.org/apps (⌘+O to open)
            2. Log in with your phone number
            3. Click "API development tools"
            4. Create an application to get your API ID and API Hash
            5. Enter credentials in Raycast preferences (⌘+,)
            6. Return here to scan the login QR code
          `}
        />
      </Form>
    );
  }

  if (authStep === "password") {
    return (
      <Form
        isLoading={isSubmitting}
        actions={
          <ActionPanel>
            <Action.SubmitForm icon={Icon.ArrowRight} title="Verify Password" onSubmit={passwordForm.handleSubmit} />
            <Action title="Back to QR Code" icon={Icon.ArrowLeft} onAction={startQrAuth} />
          </ActionPanel>
        }
      >
        <Form.PasswordField
          title="2-Step Verification Password"
          info="Enter your Telegram 2-Step Verification password"
          placeholder="Password"
          {...passwordForm.itemProps.password}
        />
      </Form>
    );
  }

  const markdown = error
    ? dedent`
      # Authenticate with Telegram

      ### ⚠️ Failed to Load QR Code

      ${error}

      <br/>

      <sub>Press **⌘+R** to reload, or check your API credentials in preferences (**⌘+,**).</sub>
    `
    : qrInfo
      ? dedent`
        # Authenticate with Telegram

        <sub>Scan with Telegram: **Settings > Devices > Link Desktop Device**</sub>

        <br/>

        <p align="center">
          <img src="${qrInfo.dataUrl}" alt="Telegram Login QR Code" width="220" />
        </p>
      `
      : dedent`
        # Authenticate with Telegram

        <sub>Generating QR code & connecting to Telegram servers...</sub>
      `;

  return (
    <Detail
      isLoading={isSubmitting || (!qrInfo && !error)}
      markdown={markdown}
      actions={
        <ActionPanel>
          {qrInfo?.tgUrl && <Action.OpenInBrowser title="Open in Telegram App" icon={Icon.Globe} url={qrInfo.tgUrl} />}
          <Action
            title="Reload QR Code"
            icon={Icon.Repeat}
            shortcut={{ modifiers: ["cmd"], key: "r" }}
            onAction={startQrAuth}
          />
          <Action
            title="Open Extension Preferences"
            icon={Icon.Gear}
            shortcut={{ modifiers: ["cmd"], key: "," }}
            onAction={openExtensionPreferences}
          />
          <Action
            title="View Setup Guide"
            icon={Icon.QuestionMark}
            onAction={() => {
              abortControllerRef.current?.abort();
              setIsSubmitting(false);
              setAuthStep("setup");
            }}
          />
        </ActionPanel>
      }
    />
  );
}
