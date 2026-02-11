import {
  Action,
  ActionPanel,
  Form,
  Icon,
  Toast,
  closeMainWindow,
  getPreferenceValues,
  popToRoot,
  showToast,
} from "@raycast/api";
import { useMemo, useState } from "react";
import nodemailer from "nodemailer";
import { showFailureToast } from "@raycast/utils";

type RecipientOption = {
  value: string;
  label: string;
  email: string;
  name?: string;
};

type FormValues = {
  subject: string;
  body: string;
  recipient?: string;
};

export default function Command() {
  const preferences = getPreferenceValues<Preferences>();
  const [isSending, setIsSending] = useState(false);

  const recipients = useMemo(() => parseRecipients(preferences.recipientList), [preferences.recipientList]);
  const defaultRecipient = recipients[0]?.value;

  async function handleSubmit(values: FormValues) {
    if (isSending) {
      return;
    }

    const selectedRecipientValue = values.recipient || defaultRecipient;
    const selectedRecipient = recipients.find((recipient) => recipient.value === selectedRecipientValue);

    if (!selectedRecipientValue || !selectedRecipient) {
      await showToast(Toast.Style.Failure, "Recipient is missing", "Update the extension preferences first.");
      return;
    }

    const toast = await showToast(Toast.Style.Animated, "Sending Email", selectedRecipient.label);
    setIsSending(true);

    try {
      await sendMail({
        host: preferences.smtpHost,
        port: Number(preferences.smtpPort),
        encryption: preferences.encryption,
        allowSelfSigned: Boolean(preferences.allowSelfSigned),
        authUser: preferences.smtpUsername?.trim() || undefined,
        authPass: preferences.smtpPassword,
        fromEmail: preferences.senderEmail,
        fromName: preferences.senderName?.trim() || undefined,
        to: selectedRecipient.email,
        subject: values.subject.trim(),
        body: values.body,
      });

      toast.style = Toast.Style.Success;
      toast.title = "Sent";
      toast.message = selectedRecipient.label;
      await closeMainWindow({ clearRootSearch: true });
      await popToRoot({ clearSearchBar: true });
    } catch (error) {
      await showFailureToast(error, { title: "Check SMTP username/password in Raycast Preferences." });
    } finally {
      setIsSending(false);
    }
  }

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title={isSending ? "Sending…" : "Send Email"}
            icon={Icon.Envelope}
            onSubmit={handleSubmit}
          />
        </ActionPanel>
      }
    >
      {recipients.length > 1 ? (
        <Form.Dropdown id="recipient" title="Recipient" defaultValue={defaultRecipient} storeValue>
          {recipients.map((recipient) => (
            <Form.Dropdown.Item key={recipient.value} value={recipient.value} title={recipient.label} />
          ))}
        </Form.Dropdown>
      ) : (
        <Form.Description title="Recipient" text={recipients[0]?.label || "Configure at least one email"} />
      )}
      <Form.TextField id="subject" title="Subject" placeholder="Reminder" autoFocus />
      <Form.TextArea
        id="body"
        title="Body"
        placeholder="Jot down the details you do not want to forget"
        enableMarkdown
      />
    </Form>
  );
}

type SendMailArgs = {
  // SMTP connection settings
  host: string;
  port: number;
  encryption: Preferences["encryption"];
  allowSelfSigned: Preferences["allowSelfSigned"];
  // Authentication (optional)
  authUser?: Preferences["smtpUsername"];
  authPass?: string;
  // Email composition
  fromEmail: Preferences["senderEmail"];
  fromName?: Preferences["senderName"];
  to: string;
  subject: string;
  body: string;
};

async function sendMail({
  host,
  port,
  encryption,
  allowSelfSigned,
  authUser,
  authPass,
  fromEmail,
  fromName,
  to,
  subject,
  body,
}: SendMailArgs) {
  if (!Number.isFinite(port)) {
    throw new Error("Invalid SMTP port");
  }

  const transportOptions: Record<string, unknown> = {
    host,
    port,
    secure: encryption === "ssl_tls",
  };

  if (encryption === "starttls") {
    transportOptions.requireTLS = true;
    transportOptions.secure = false;
  }

  if (encryption === "none") {
    transportOptions.secure = false;
  }

  if (authUser && authPass) {
    transportOptions.auth = {
      user: authUser,
      pass: authPass,
    };
  }

  if (allowSelfSigned) {
    transportOptions.tls = {
      rejectUnauthorized: false,
    };
  }

  const transporter = nodemailer.createTransport(transportOptions as nodemailer.TransportOptions);

  await transporter.sendMail({
    from: formatAddress(fromEmail, fromName),
    to,
    subject: subject || "(no subject)",
    text: body,
    headers: {
      "X-Mailer": "Raycast Mail to Self",
    },
  });
}

function parseRecipients(value: string): RecipientOption[] {
  if (!value) {
    return [];
  }

  const normalized = value
    .split(/\n|,/)
    .map((entry) => entry.trim())
    .filter(Boolean);

  const seen = new Set<string>();

  return normalized
    .map((entry) => {
      const match = entry.match(/^(.*)<([^<>]+)>$/);
      if (match) {
        const name = match[1].trim().replace(/^"|"$/g, "");
        const email = match[2].trim();
        if (!email || seen.has(email.toLowerCase())) {
          return undefined;
        }

        seen.add(email.toLowerCase());
        return {
          value: email,
          label: name || email,
          email,
          name: name || undefined,
        };
      }

      if (seen.has(entry.toLowerCase())) {
        return undefined;
      }

      seen.add(entry.toLowerCase());
      return {
        value: entry,
        label: entry,
        email: entry,
      };
    })
    .filter((item): item is RecipientOption => Boolean(item));
}

function formatAddress(email: string, name?: string) {
  if (!name) {
    return email;
  }

  const safeName = name.replace(/"/g, "'");
  return `"${safeName}" <${email}>`;
}
