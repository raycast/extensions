import { useState } from "react";
import { Form, ActionPanel, Action, popToRoot, Icon } from "@raycast/api";
import { useForm, FormValidation } from "@raycast/utils";
import dedent from "dedent";
import { handleAuthFlow, handlePasswordFlow } from "./utils/auth";

interface AuthCodeFormValues {
  code: string;
}

interface AuthPasswordFormValues {
  password: string;
}

export default function Authenticate() {
  const [needsCode, setNeedsCode] = useState(false);
  const [needsPassword, setNeedsPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { handleSubmit: handleCodeSubmit, itemProps: codeItemProps } = useForm<AuthCodeFormValues>({
    onSubmit: async (values) => {
      setIsSubmitting(true);
      try {
        const result = await handleAuthFlow(values.code);
        if (result.success) {
          await popToRoot();
        } else if (result.needsPassword) {
          setNeedsPassword(true);
        }
      } finally {
        setIsSubmitting(false);
      }
    },
    validation: {
      code: FormValidation.Required,
    },
  });

  const { handleSubmit: handlePasswordSubmit, itemProps: passwordItemProps } = useForm<AuthPasswordFormValues>({
    onSubmit: async (values) => {
      setIsSubmitting(true);
      try {
        const result = await handlePasswordFlow(values.password);
        if (result.success) {
          await popToRoot();
        }
      } finally {
        setIsSubmitting(false);
      }
    },
    validation: {
      password: FormValidation.Required,
    },
  });

  const handleInitialAuth = async () => {
    const result = await handleAuthFlow();
    if (result.needsCode) {
      setNeedsCode(true);
    } else if (result.success) {
      await popToRoot();
    }
  };

  if (needsPassword) {
    return (
      <Form
        isLoading={isSubmitting}
        actions={
          <ActionPanel>
            <Action.SubmitForm icon={Icon.Lock} title="Verify Password" onSubmit={handlePasswordSubmit} />
          </ActionPanel>
        }
      >
        <Form.PasswordField
          title="Two-Factor Authentication Password"
          info="Your Telegram two-factor authentication password"
          placeholder="Enter your 2FA password"
          {...passwordItemProps.password}
        />
      </Form>
    );
  }

  if (needsCode) {
    return (
      <Form
        isLoading={isSubmitting}
        actions={
          <ActionPanel>
            <Action.SubmitForm icon={Icon.ArrowRight} title="Verify Code" onSubmit={handleCodeSubmit} />
          </ActionPanel>
        }
      >
        <Form.TextField
          title="Verification Code"
          info="Enter the verification code sent to your Telegram app"
          placeholder="12345"
          {...codeItemProps.code}
        />
      </Form>
    );
  }

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
