import { Action, ActionPanel, Form, Icon, Toast, showToast } from "@raycast/api";
import { useState } from "react";
import { sendList } from "./lib/api";
import { usePreferencesCheck } from "./lib/usePreferencesCheck";
import { useInstances } from "./lib/useInstances";
import { InstanceDropdown } from "./components/InstanceDropdown";

type Values = {
  instanceName: string;
  number: string;
  title: string;
  description: string;
  buttonText: string;
  footerText: string;
  sectionsJson: string;
};

export default function Command() {
  const { isValid, isChecking } = usePreferencesCheck();
  const { instances, isLoading: loadingInstances } = useInstances(isValid);
  const [isLoading, setIsLoading] = useState(false);

  if (isChecking) return <Form isLoading={true} />;
  if (!isValid) return <Form isLoading={false} />;

  async function handleSubmit(values: Values) {
    setIsLoading(true);
    try {
      const sections = JSON.parse(values.sectionsJson) as Array<{
        title: string;
        rows: Array<{ title: string; description: string; rowId: string }>;
      }>;
      await sendList({
        instanceName: values.instanceName,
        number: values.number,
        title: values.title,
        description: values.description,
        buttonText: values.buttonText,
        footerText: values.footerText,
        sections,
      });
      await showToast({ style: Toast.Style.Success, title: "List message sent" });
    } catch (e) {
      const message = (e as { message?: string })?.message || "Failed to send list";
      await showToast({ style: Toast.Style.Failure, title: "Error", message });
    } finally {
      setIsLoading(false);
    }
  }

  const exampleSections = `[
  {
    "title": "Section 1",
    "rows": [
      {"title": "Row 1", "description": "Description 1", "rowId": "row1"},
      {"title": "Row 2", "description": "Description 2", "rowId": "row2"}
    ]
  }
]`;

  return (
    <Form
      navigationTitle="Send Interactive List"
      isLoading={isLoading || loadingInstances}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Send" icon={Icon.Airplane} onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <InstanceDropdown instances={instances} isLoading={loadingInstances} />
      <Form.TextField id="number" title="Recipient Number" placeholder="e.g. 55999999999" />
      <Form.TextField id="title" title="List Title" placeholder="Select an option" />
      <Form.TextArea id="description" title="Description" placeholder="Please choose from the list below" />
      <Form.TextField id="buttonText" title="Button Text" placeholder="Click Here" />
      <Form.TextField id="footerText" title="Footer Text" placeholder="Footer info" />
      <Form.TextArea
        id="sectionsJson"
        title="Sections (JSON)"
        placeholder={exampleSections}
        info="JSON array of sections with rows"
      />
    </Form>
  );
}
