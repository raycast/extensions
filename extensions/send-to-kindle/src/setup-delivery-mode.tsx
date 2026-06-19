import { Action, ActionPanel, Detail, Form, Icon, Toast, showToast } from "@raycast/api";
import { useForm } from "@raycast/utils";
import { useEffect, useState } from "react";
import { EmailPreferences, testEmailPreferences } from "./email";
import { SendMethod, getStoredSendSettings, setStoredSendSettings } from "./settings";

const AMAZON_EMAIL_HELP_URL = "https://www.amazon.com/sendtokindle/email";
const GMAIL_SMTP_HELP_URL =
  "https://support.google.com/mail/answer/7104828?hl=en&visit_id=639059758371114804-114182322&rd=1";
const GMAIL_APP_PASSWORD_HELP_URL = "https://support.google.com/mail/answer/185833?sjid=16238667612725057818-EU";

type SetupFormValues = {
  sendMethod: SendMethod;
  kindleEmail: string;
  senderEmail: string;
  smtpHost: string;
  smtpPort: string;
  smtpSecurity: "ssl" | "starttls" | "none";
  smtpUsername: string;
  smtpPassword: string;
};

type SetupDeliveryModeFormProps = {
  onCompleted?: () => void;
};

export default function Command() {
  return <SetupDeliveryModeForm />;
}

export function SetupDeliveryModeForm({ onCompleted }: SetupDeliveryModeFormProps) {
  const [initialValues, setInitialValues] = useState<SetupFormValues | null>(null);

  useEffect(() => {
    let mounted = true;

    async function loadInitialValues() {
      const saved = await getStoredSendSettings();
      if (!mounted) return;

      setInitialValues({
        sendMethod: saved?.sendMethod ?? "app",
        kindleEmail: saved?.kindleEmail ?? "",
        senderEmail: saved?.senderEmail ?? "",
        smtpHost: saved?.smtpHost ?? "",
        smtpPort: saved?.smtpPort ?? "465",
        smtpSecurity: saved?.smtpSecurity ?? "ssl",
        smtpUsername: saved?.smtpUsername ?? "",
        smtpPassword: saved?.smtpPassword ?? "",
      });
    }

    loadInitialValues();
    return () => {
      mounted = false;
    };
  }, []);

  if (!initialValues) {
    return <Detail isLoading markdown="Loading sending settings..." navigationTitle="Set / Change Sending Method" />;
  }

  return <SetupDeliveryModeFormBody initialValues={initialValues} onCompleted={onCompleted} />;
}

type SetupDeliveryModeFormBodyProps = {
  initialValues: SetupFormValues;
  onCompleted?: () => void;
};

function SetupDeliveryModeFormBody({ initialValues, onCompleted }: SetupDeliveryModeFormBodyProps) {
  const [sendMethod, setSendMethod] = useState<SendMethod>(initialValues.sendMethod);

  const { handleSubmit, itemProps, setValue, values } = useForm<SetupFormValues>({
    initialValues,
    validation: {
      kindleEmail: (value) => {
        if (sendMethod !== "email") return undefined;
        return isEmail(value) ? undefined : "Enter a valid Kindle email address.";
      },
      senderEmail: (value) => {
        if (sendMethod !== "email") return undefined;
        return isEmail(value) ? undefined : "Enter a valid sender email address.";
      },
      smtpHost: (value) => {
        if (sendMethod !== "email") return undefined;
        return value?.trim() ? undefined : "SMTP host is required.";
      },
      smtpPort: (value) => {
        if (sendMethod !== "email") return undefined;
        const port = Number(value);
        if (!Number.isInteger(port) || port <= 0 || port > 65535) {
          return "Enter a valid SMTP port.";
        }
        return undefined;
      },
      smtpUsername: (value) => {
        if (sendMethod !== "email") return undefined;
        return value?.trim() ? undefined : "SMTP username is required.";
      },
      smtpPassword: (value) => {
        if (sendMethod !== "email") return undefined;
        return value?.trim() ? undefined : "SMTP password is required.";
      },
    },
    onSubmit: async (values) => {
      const trimmedValues = normalizeValues(values);

      try {
        if (trimmedValues.sendMethod === "email") {
          await showToast({
            style: Toast.Style.Animated,
            title: "Testing email settings",
            message: "Checking SMTP connection and recipient acceptance...",
          });
          await testEmailPreferences(trimmedValues);
        }

        await setStoredSendSettings(trimmedValues);
        await showToast({
          style: Toast.Style.Success,
          title: "Delivery mode saved",
          message:
            trimmedValues.sendMethod === "email"
              ? "Email setup is valid and ready."
              : "Send to Kindle app mode is ready.",
        });
        onCompleted?.();
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        await showToast({
          style: Toast.Style.Failure,
          title: "Setup failed",
          message,
        });
      }
    },
  });

  return (
    <Form
      navigationTitle="Choose Delivery Mode"
      searchBarAccessory={<Form.LinkAccessory target={AMAZON_EMAIL_HELP_URL} text="Amazon Email Guide" />}
      actions={
        <ActionPanel>
          <Action.SubmitForm title={sendMethod === "email" ? "Test and Save" : "Save"} onSubmit={handleSubmit} />
          <Action.OpenInBrowser
            title="Open Amazon Send to Kindle Email Guide"
            icon={Icon.Globe}
            url={AMAZON_EMAIL_HELP_URL}
          />
          <Action.OpenInBrowser title="Open Gmail SMTP Setup Guide" icon={Icon.Globe} url={GMAIL_SMTP_HELP_URL} />
          <Action.OpenInBrowser
            title="Open Gmail App Password Guide"
            icon={Icon.Globe}
            url={GMAIL_APP_PASSWORD_HELP_URL}
          />
        </ActionPanel>
      }
    >
      <Form.Description
        title="Set up delivery"
        text="Choose how you want to deliver articles to Kindle. You can change this later at any time."
      />
      <Form.Dropdown
        id="sendMethod"
        title="Delivery Method"
        value={sendMethod}
        onChange={(value) => {
          const mode = value as SendMethod;
          setSendMethod(mode);
          setValue("sendMethod", mode);
        }}
      >
        <Form.Dropdown.Item value="app" title="Send to Kindle app (Mac)" />
        <Form.Dropdown.Item value="email" title="Email (Recommended)" />
      </Form.Dropdown>
      <Form.Description
        title="Option 1: Send to Kindle app (Mac)"
        text="Slow and less convenient, requires Amazon's Send to Kindle app installed on your Mac, but setup is minimal."
      />
      <Form.Description
        title="Option 2: Email (Recommended)"
        text="Faster for daily usage. Add your sender email to Amazon's approved list, then this extension sends the EPUB attachment to your Kindle address."
      />

      {sendMethod === "email" && (
        <>
          <Form.Separator />
          <Form.TextField title="Kindle Address" placeholder="yourname@kindle.com" {...itemProps.kindleEmail} />
          <Form.TextField title="Sender Address" placeholder="you@example.com" {...itemProps.senderEmail} />
          <Form.TextField title="SMTP Server" placeholder="smtp.example.com" {...itemProps.smtpHost} />
          <Form.TextField title="SMTP Port" placeholder="465" {...itemProps.smtpPort} />
          <Form.Dropdown
            id="smtpSecurity"
            title="SMTP Security"
            value={values.smtpSecurity ?? "ssl"}
            onChange={(value) => setValue("smtpSecurity", value as "ssl" | "starttls" | "none")}
          >
            <Form.Dropdown.Item value="ssl" title="SSL/TLS" />
            <Form.Dropdown.Item value="starttls" title="STARTTLS" />
            <Form.Dropdown.Item value="none" title="None" />
          </Form.Dropdown>
          <Form.TextField title="SMTP Username" placeholder="you@example.com" {...itemProps.smtpUsername} />
          <Form.PasswordField title="SMTP Password" {...itemProps.smtpPassword} />
          <Form.Description
            title="Gmail-specific setup"
            text="Enable POP in Gmail settings first. Then use: SMTP Server smtp.gmail.com, SMTP Port 587, SMTP Security STARTTLS, SMTP Username your Gmail address, SMTP Password your Google App Password."
          />
        </>
      )}
    </Form>
  );
}

function normalizeValues(values: SetupFormValues): EmailPreferences & { sendMethod: SendMethod } {
  const sendMethod = values.sendMethod;
  if (sendMethod === "app") {
    return { sendMethod: "app" };
  }

  return {
    sendMethod,
    kindleEmail: values.kindleEmail?.trim(),
    senderEmail: values.senderEmail?.trim(),
    smtpHost: values.smtpHost?.trim(),
    smtpPort: values.smtpPort?.trim(),
    smtpSecurity: values.smtpSecurity,
    smtpUsername: values.smtpUsername?.trim(),
    smtpPassword: values.smtpPassword ?? "",
  };
}

function isEmail(value?: string) {
  if (!value) return false;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}
