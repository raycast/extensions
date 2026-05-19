import {
  Action,
  ActionPanel,
  Form,
  popToRoot,
  showToast,
  Toast,
} from "@raycast/api";
import { useEffect, useState } from "react";
import {
  DEFAULT_TEMPLATE,
  EmailTemplate,
  getEmailTemplate,
  resetEmailTemplate,
  saveEmailTemplate,
  TEMPLATE_PLACEHOLDERS,
} from "./template";

type Values = EmailTemplate;

export default function Command() {
  const [template, setTemplate] = useState<EmailTemplate>(DEFAULT_TEMPLATE);
  const formKey = `${template.subject}:${template.body}`;

  useEffect(() => {
    async function loadTemplate() {
      setTemplate(await getEmailTemplate());
    }

    loadTemplate();
  }, []);

  async function handleSubmit(values: Values) {
    if (!values.subject.trim()) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Missing subject template",
      });
      return;
    }

    if (!values.body.trim()) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Missing body template",
      });
      return;
    }

    await saveEmailTemplate({
      subject: values.subject.trim(),
      body: values.body.trim(),
    });
    await showToast({
      style: Toast.Style.Success,
      title: "Saved email template",
    });
    await popToRoot();
  }

  return (
    <Form
      key={formKey}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Save Template" onSubmit={handleSubmit} />
          <Action
            title="Reset to Default Template"
            style={Action.Style.Destructive}
            shortcut={{ modifiers: ["cmd", "shift"], key: "r" }}
            onAction={async () => {
              await resetEmailTemplate();
              setTemplate(DEFAULT_TEMPLATE);
              await showToast({
                style: Toast.Style.Success,
                title: "Reset template",
              });
            }}
          />
        </ActionPanel>
      }
    >
      <Form.Description
        text={`Available placeholders: ${TEMPLATE_PLACEHOLDERS}`}
      />
      <Form.TextField
        id="subject"
        title="Subject Template"
        placeholder="Quick note for {{company}}"
        defaultValue={template.subject}
      />
      <Form.TextArea
        id="body"
        title="Body Template"
        placeholder="Write the full email body here."
        defaultValue={template.body}
      />
    </Form>
  );
}
