import { ActionPanel, Action, Form, showToast, Toast, getPreferenceValues, LocalStorage, Icon } from "@raycast/api";
import { useState, useEffect } from "react";
import { parseOtpAuthUrl } from "./otp-utils";

interface Preferences {
  otpAuthUrl: string;
  prefix: string;
}

interface StoredSettings {
  otpAuthUrl: string;
  prefix: string;
}

export default function OTPSettings() {
  const preferences = getPreferenceValues<Preferences>();
  const [otpUrl, setOtpUrl] = useState("");
  const [prefix, setPrefix] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [urlError, setUrlError] = useState("");

  useEffect(() => {
    // Load settings from LocalStorage first, fallback to preferences
    const loadSettings = async () => {
      try {
        const stored = await LocalStorage.getItem<string>("otp-settings");
        if (stored) {
          const settings: StoredSettings = JSON.parse(stored);
          setOtpUrl(settings.otpAuthUrl || "");
          setPrefix(settings.prefix || "");
        } else {
          // Fallback to preferences
          setOtpUrl(preferences.otpAuthUrl || "");
          setPrefix(preferences.prefix || "");
        }
      } catch {
        // Fallback to preferences on error
        setOtpUrl(preferences.otpAuthUrl || "");
        setPrefix(preferences.prefix || "");
      }
      setIsLoading(false);
    };

    loadSettings();
  }, [preferences]);

  const validateOtpUrl = (url: string) => {
    if (!url) {
      setUrlError("");
      return true;
    }

    if (!url.startsWith("otpauth://")) {
      setUrlError("URL must start with 'otpauth://'");
      return false;
    }

    try {
      parseOtpAuthUrl(url);
      setUrlError("");
      return true;
    } catch (error) {
      setUrlError(error instanceof Error ? error.message : "Invalid OTP URL format");
      return false;
    }
  };

  const handleOtpUrlChange = (value: string) => {
    setOtpUrl(value);
    validateOtpUrl(value);
  };

  const handleSubmit = async () => {
    try {
      if (otpUrl && !validateOtpUrl(otpUrl)) {
        return;
      }

      // Save to LocalStorage instead of preferences
      const settings: StoredSettings = {
        otpAuthUrl: otpUrl,
        prefix: prefix,
      };

      await LocalStorage.setItem("otp-settings", JSON.stringify(settings));

      await showToast({
        style: Toast.Style.Success,
        title: "✅ Settings Saved",
        message: "Your OTP configuration has been updated successfully!",
      });
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "❌ Save Failed",
        message: error instanceof Error ? error.message : "Failed to save settings",
      });
    }
  };

  if (isLoading) {
    return <Form isLoading={true} />;
  }

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="💾 Save Configuration" onSubmit={handleSubmit} icon={Icon.SaveDocument} />
          <Action
            title="🔄 Reset to Default"
            onAction={() => {
              setOtpUrl("");
              setPrefix("");
              setUrlError("");
            }}
            icon={Icon.Undo}
            style={Action.Style.Destructive}
          />
        </ActionPanel>
      }
    >
      <Form.Description
        title="🔐 OTP Configuration"
        text="Configure your One-Time Password settings for secure authentication"
      />

      <Form.Separator />

      <Form.TextArea
        id="otpUrl"
        title="🔑 OTP Authentication URL"
        placeholder="otpauth://totp/example%3Auser%40example.com?secret=ABCD1234..."
        value={otpUrl}
        onChange={handleOtpUrlChange}
        error={urlError}
        info="Paste your OTP authentication URL here. You can get this by scanning the QR code or copying the URL from your authenticator app setup."
      />

      <Form.TextField
        id="prefix"
        title="📝 Custom Prefix"
        placeholder="e.g., 'Company-' or leave empty"
        value={prefix}
        onChange={setPrefix}
        info="Optional: Add a prefix that will be automatically added before each OTP code when copying/pasting"
      />

      <Form.Separator />

      {otpUrl && !urlError && (
        <Form.Description
          title="✅ Configuration Valid"
          text="Your OTP URL is valid and ready to use. Press ⌘+↩ to save."
        />
      )}

      {!otpUrl && (
        <Form.Description
          title="ℹ️ Getting Started"
          text="1. Open your authenticator app (Google Authenticator, Authy, etc.)
2. Add a new account and copy the setup URL
3. Paste it in the OTP Authentication URL field above
4. Optionally add a custom prefix
5. Save your configuration"
        />
      )}
    </Form>
  );
}
