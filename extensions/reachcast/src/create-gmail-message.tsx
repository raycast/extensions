import {
  Action,
  ActionPanel,
  Form,
  open,
  showToast,
  Toast,
} from "@raycast/api";
import { useEffect, useState } from "react";
import {
  DEFAULT_TEMPLATE,
  EmailTemplate,
  getEmailTemplate,
  getTemplatePlaceholders,
} from "./template";

type Values = {
  recipient: string;
  includeScheduleReminder: boolean;
  [key: string]: boolean | string;
};

type Draft = {
  recipient: string;
  subject: string;
  body: string;
  url: string;
};

export default function Command() {
  const [template, setTemplate] = useState<EmailTemplate>(DEFAULT_TEMPLATE);
  const placeholders = getTemplatePlaceholders(template);

  useEffect(() => {
    async function loadTemplate() {
      setTemplate(await getEmailTemplate());
    }

    loadTemplate();
  }, []);

  async function handleSubmit(values: Values) {
    const validationMessage = validate(values, template);

    if (validationMessage) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Missing required field",
        message: validationMessage,
      });
      return;
    }

    const draft = createDraft(values, template);

    await open(draft.url);
    await showToast({
      style: Toast.Style.Success,
      title: "Opened Gmail compose",
      message: values.includeScheduleReminder
        ? "Use Gmail's schedule send menu before sending."
        : draft.recipient,
    });
  }

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="Open Gmail Compose"
            onSubmit={handleSubmit}
          />
        </ActionPanel>
      }
    >
      <Form.Description text="Fill the template fields and ReachCast will open Gmail with the recipient, subject, and body ready. Gmail compose links cannot add attachments or schedule send automatically." />
      <Form.TextField
        id="recipient"
        title="Recipient Email"
        placeholder="alex@example.com"
      />
      <Form.Separator />
      {placeholders.map((placeholder) => (
        <TemplateField key={placeholder} placeholder={placeholder} />
      ))}
      <Form.Checkbox
        id="includeScheduleReminder"
        title="Send Timing"
        label="Remind me to schedule this in Gmail"
        defaultValue
      />
    </Form>
  );
}

function validate(values: Values, template: EmailTemplate) {
  if (!values.recipient.trim()) {
    return "Add a recipient email.";
  }

  if (!isValidEmail(values.recipient)) {
    return "Use a valid recipient email address.";
  }

  for (const placeholder of getTemplatePlaceholders(template)) {
    const value = values[placeholder];

    if (typeof value !== "string" || !value.trim()) {
      return `Add ${getFieldTitle(placeholder).toLowerCase()}.`;
    }
  }

  if (
    typeof values.postingUrl === "string" &&
    values.postingUrl.trim() &&
    !isValidUrl(values.postingUrl)
  ) {
    return "Use a valid URL.";
  }

  return undefined;
}

function createDraft(values: Values, template: EmailTemplate): Draft {
  const templateValues = getTemplateValues(values, template);

  const subject = renderTemplate(template.subject, templateValues);
  const body = renderTemplate(template.body, templateValues);
  const recipient = values.recipient.trim();
  const url = createGmailComposeUrl({ recipient, subject, body });

  return { recipient, subject, body, url };
}

function TemplateField({ placeholder }: { placeholder: string }) {
  const title = getFieldTitle(placeholder);
  const fieldPlaceholder = getFieldPlaceholder(placeholder);

  if (placeholder === "techStack") {
    return (
      <Form.TextArea
        id={placeholder}
        title={title}
        placeholder={fieldPlaceholder}
      />
    );
  }

  return (
    <Form.TextField
      id={placeholder}
      title={title}
      placeholder={fieldPlaceholder}
    />
  );
}

function getTemplateValues(values: Values, template: EmailTemplate) {
  const templateValues: Record<string, string> = {};

  for (const placeholder of getTemplatePlaceholders(template)) {
    const value = values[placeholder];
    templateValues[placeholder] = typeof value === "string" ? value.trim() : "";
  }

  return templateValues;
}

function getFieldTitle(placeholder: string) {
  return placeholder
    .replaceAll(/([a-z])([A-Z])/g, "$1 $2")
    .replaceAll(/[-_]/g, " ")
    .replace(/^\w/, (firstLetter) => firstLetter.toUpperCase());
}

function getFieldPlaceholder(placeholder: string) {
  const placeholders: Record<string, string> = {
    role: "Product Manager",
    company: "Acme",
    postingUrl: "https://example.com/posting",
    techStack: "TypeScript, PostgreSQL, and AWS",
  };

  return placeholders[placeholder] ?? `Value for {{${placeholder}}}`;
}

function renderTemplate(template: string, values: Record<string, string>) {
  return template.replaceAll(
    /{{(\w+)}}/g,
    (_, key: string) => values[key] ?? "",
  );
}

function createGmailComposeUrl({
  recipient,
  subject,
  body,
}: Omit<Draft, "url">) {
  const searchParams = new URLSearchParams({
    view: "cm",
    fs: "1",
    to: recipient,
    su: subject,
    body,
  });

  return `https://mail.google.com/mail/?${searchParams.toString()}`;
}

function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

function isValidUrl(value: string) {
  try {
    const url = new URL(value.trim());
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}
