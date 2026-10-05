import { Action, ActionPanel, Form, Icon, popToRoot, showToast, Toast } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { useState } from "react";
import { SetupGuide } from "./components/setup-guide.js";
import { sendMail } from "./lib/mail-client.js";
import { hasMailCredentials } from "./lib/preferences.js";
import { ComposeTemplate, getTemplates, saveTemplate } from "./lib/templates.js";

type ComposeValues = {
  to: string;
  cc?: string;
  bcc?: string;
  subject: string;
  body: string;
};

export default function Command() {
  if (!hasMailCredentials()) {
    return <SetupGuide />;
  }

  const { data: templates = [], revalidate } = useCachedPromise(getTemplates, []);
  const [selectedTemplateId, setSelectedTemplateId] = useState("blank");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");

  function applyTemplate(templateId: string) {
    setSelectedTemplateId(templateId);

    const template = templates.find((item) => item.id === templateId);
    if (!template) {
      setSubject("");
      setBody("");
      return;
    }

    setSubject(template.subject);
    setBody(template.body);
  }

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="Send Mail"
            icon={Icon.Airplane}
            onSubmit={async (values: ComposeValues) => {
              const toast = await showToast({
                style: Toast.Style.Animated,
                title: "Sending mail",
              });
              try {
                await sendMail({ ...values, subject, body });
                toast.style = Toast.Style.Success;
                toast.title = "Mail sent";
                await popToRoot();
              } catch (error) {
                toast.style = Toast.Style.Failure;
                toast.title = "Failed to send mail";
                toast.message = error instanceof Error ? error.message : String(error);
              }
            }}
          />
          <Action
            title="Save as Template"
            icon={Icon.Bookmark}
            onAction={async () => {
              const name = subject.trim() || "Untitled Template";
              const template: ComposeTemplate = {
                id: `${Date.now()}`,
                name,
                subject,
                body,
              };
              await saveTemplate(template);
              await revalidate();
              await showToast({
                style: Toast.Style.Success,
                title: "Template saved",
              });
            }}
          />
        </ActionPanel>
      }
    >
      <Form.Dropdown id="template" title="Template" value={selectedTemplateId} onChange={applyTemplate}>
        <Form.Dropdown.Item title="Blank" value="blank" />
        {templates.map((template) => (
          <Form.Dropdown.Item key={template.id} title={template.name} value={template.id} />
        ))}
      </Form.Dropdown>
      <Form.TextField id="to" title="To" placeholder="name@example.com" />
      <Form.TextField id="cc" title="Cc" placeholder="Optional" />
      <Form.TextField id="bcc" title="Bcc" placeholder="Optional" />
      <Form.TextField id="subject" title="Subject" value={subject} onChange={setSubject} />
      <Form.TextArea id="body" title="Body" value={body} onChange={setBody} />
    </Form>
  );
}
