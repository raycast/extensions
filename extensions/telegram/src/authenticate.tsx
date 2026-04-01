import { useState } from "react";
import { Form, ActionPanel, Action, showToast, Toast, popToRoot, Icon } from "@raycast/api";
import { useForm, FormValidation } from "@raycast/utils";
import dedent from "dedent";
import { handleAuthFlow } from "./utils/auth";

interface AuthCodeFormValues {
  code: string;
}

interface AuthPasswordFormValues {
  password: string;
}

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "Unknown error occurred";
}

export default function Authenticate() {
  const [authStep, setAuthStep] = useState<"setup" | "code" | "password">("setup");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const codeForm = useForm<AuthCodeFormValues>({
    onSubmit: async (values) => {
      setIsSubmitting(true);
      try {
        const result = await handleAuthFlow({ code: values.code });
        if (result.success) {
          await showToast({
            style: Toast.Style.Success,
            title: "Successfully authenticated with Telegram",
          });
          await popToRoot();
          return;
        }

        if (result.needsPassword) {
          setAuthStep("password");
        }
      } catch (error) {
        await showToast({
          style: Toast.Style.Failure,
          title: "Authentication Failed",
          message: getErrorMessage(error),
        });
      } finally {
        setIsSubmitting(false);
      }
    },
    validation: {
      code: FormValidation.Required,
    },
  });

  const passwordForm = useForm<AuthPasswordFormValues>({
    onSubmit: async (values) => {
      setIsSubmitting(true);
      try {
        const result = await handleAuthFlow({ password: values.password });
        if (result.success) {
          await showToast({
            style: Toast.Style.Success,
            title: "Successfully authenticated with Telegram",
          });
          await popToRoot();
        }
      } catch (error) {
        await showToast({
          style: Toast.Style.Failure,
          title: "Authentication Failed",
          message: getErrorMessage(error),
        });
      } finally {
        setIsSubmitting(false);
      }
    },
    validation: {
      password: FormValidation.Required,
    },
  });

  const handleInitialAuth = async () => {
    try {
      const result = await handleAuthFlow();
      if (result.needsCode) {
        setAuthStep("code");
      } else if (result.needsPassword) {
        setAuthStep("password");
      } else if (result.success) {
        await showToast({
          style: Toast.Style.Success,
          title: "Successfully authenticated with Telegram",
        });
        await popToRoot();
      }
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Authentication Failed",
        message: getErrorMessage(error),
      });
    }
  };

  const handleResendCode = async () => {
    setIsSubmitting(true);
    try {
      const result = await handleAuthFlow({ forceResendCode: true });
      if (result.needsCode) {
        setAuthStep("code");
      } else if (result.needsPassword) {
        setAuthStep("password");
      } else if (result.success) {
        await showToast({
          style: Toast.Style.Success,
          title: "Successfully authenticated with Telegram",
        });
        await popToRoot();
      }
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Authentication Failed",
        message: getErrorMessage(error),
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (authStep === "setup") {
    return (
      <Form
        actions={
          <ActionPanel>
            <Action icon={Icon.ArrowRight} title="Send Verification Code" onAction={handleInitialAuth} />
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
          text="Before authenticating, you need to configure your Telegram API credentials in the extension preferences (⌘+,)."
        />
        <Form.Separator />
        <Form.Description
          title="How to Get API Credentials"
          text={dedent`
            1. Visit https://my.telegram.org/apps (⌘+O to open)
            2. Log in with your phone number
            3. Click "API development tools"
            4. Create an application to get your API ID and API Hash
            5. Enter these credentials in Raycast preferences
            6. Return here and click "Send Verification Code"
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

  return (
    <Form
      isLoading={isSubmitting}
      actions={
        <ActionPanel>
          <Action.SubmitForm icon={Icon.ArrowRight} title="Verify Code" onSubmit={codeForm.handleSubmit} />
          <Action
            icon={Icon.Repeat}
            title="Resend Verification Code"
            onAction={handleResendCode}
            shortcut={{ modifiers: ["cmd"], key: "r" }}
          />
        </ActionPanel>
      }
    >
      <Form.TextField
        title="Verification Code"
        info="Enter the verification code sent to your Telegram app"
        placeholder="12345"
        {...codeForm.itemProps.code}
      />
      <Form.Description title="Need a New Code?" text="Didn't get a code? Press ⌘R to resend." />
    </Form>
  );
}
