import { useState } from "react";
import { Form, ActionPanel, Action, showToast, Toast, popToRoot, Icon } from "@raycast/api";
import dedent from "dedent";
import { handleAuthFlow } from "./utils/auth";

export default function Authenticate() {
  const [code, setCode] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [needsCode, setNeedsCode] = useState(false);

  const handleInitialAuth = async () => {
    setIsLoading(true);
    try {
      const result = await handleAuthFlow();
      if (result.needsCode) {
        setNeedsCode(true);
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
        message: error instanceof Error ? error.message : "Unknown error occurred",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleCodeSubmit = async () => {
    if (!code.trim()) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Empty Code",
        message: "Please enter the verification code",
      });
      return;
    }

    setIsLoading(true);
    try {
      const result = await handleAuthFlow(code);
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
        message: error instanceof Error ? error.message : "Unknown error occurred",
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (!needsCode) {
    return (
      <Form
        isLoading={isLoading}
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

  return (
    <Form
      isLoading={isLoading}
      actions={
        <ActionPanel>
          <Action.SubmitForm icon={Icon.ArrowRight} title="Verify Code" onSubmit={handleCodeSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField
        id="code"
        title="Verification Code"
        info="Enter the verification code sent to your Telegram app"
        placeholder="12345"
        value={code}
        onChange={setCode}
      />
    </Form>
  );
}
