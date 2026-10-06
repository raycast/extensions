import { useState, useEffect, useCallback } from "react";
import { Form, Detail, ActionPanel, Action, popToRoot, Icon } from "@raycast/api";
import { useForm, FormValidation } from "@raycast/utils";
import dedent from "dedent";
import { handleQrAuthFlow, handlePasswordAuthFlow, getConfig } from "./utils/auth";

interface AuthPasswordFormValues {
  password: string;
}

export default function Authenticate() {
  const [authStep, setAuthStep] = useState<"qr" | "password" | "setup">("qr");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [qrInfo, setQrInfo] = useState<{ tgUrl: string; dataUrl: string } | null>(null);
  const [abortController, setAbortController] = useState<AbortController | null>(null);

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

  const startQrAuth = useCallback(async () => {
    try {
      getConfig();
    } catch {
      setAuthStep("setup");
      return;
    }

    abortController?.abort();
    const controller = new AbortController();
    setAbortController(controller);
    setQrInfo(null);
    setIsSubmitting(true);
    setAuthStep("qr");

    try {
      const result = await handleQrAuthFlow({
        onQrCode: (data) => {
          setQrInfo(data);
          setIsSubmitting(false);
        },
        abortSignal: controller.signal,
      });

      if (result.success) {
        await popToRoot();
      } else if (result.needsPassword) {
        setAuthStep("password");
      }
    } catch {
      // Toast handled in handleQrAuthFlow
    } finally {
      setIsSubmitting(false);
    }
  }, [abortController]);

  useEffect(() => {
    try {
      getConfig();
      startQrAuth();
    } catch {
      setAuthStep("setup");
    }

    return () => {
      abortController?.abort();
    };
  }, []);

  if (authStep === "setup") {
    return (
      <Form
        isLoading={isSubmitting}
        actions={
          <ActionPanel>
            <Action.SubmitForm icon={Icon.ArrowRight} title="Log in" onSubmit={startQrAuth} />
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

  const markdown = qrInfo
    ? dedent`
      ### Scan with Telegram: **Settings > Devices > Link Desktop Device**

      ![Telegram Login QR Code](${qrInfo.dataUrl})
    `
    : dedent`
      ### Generating QR Code...

      Connecting to Telegram servers...
    `;

  return (
    <Detail
      isLoading={isSubmitting || !qrInfo}
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
            title="Configure API Credentials"
            icon={Icon.Gear}
            shortcut={{ modifiers: ["cmd"], key: "," }}
            onAction={() => {
              abortController?.abort();
              setAuthStep("setup");
            }}
          />
        </ActionPanel>
      }
    />
  );
}
