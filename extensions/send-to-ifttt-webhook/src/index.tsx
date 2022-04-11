import { Form, ActionPanel, Action, showToast, getPreferenceValues, showHUD, popToRoot } from "@raycast/api";
import fetch from "node-fetch";

interface CommandForm {
  value1: string;
  value2: string;
  value3: string;
}

export default function Command() {
  const { eventName, webhooksKey } = getPreferenceValues<{
    eventName: string;
    webhooksKey: string;
    nbValues: string;
  }>();
  async function handleSubmit(values: CommandForm) {
    try {
      await fetch(`https://maker.ifttt.com/trigger/${eventName}/with/key/${webhooksKey}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(values),
      });
      await showHUD("Sent to IFTTT 🚀");
      await popToRoot();
    } catch (error) {
      await showToast({ title: "An error occurred!", message: "Please check your internet connection." });
    }
  }

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.Description title="Event Name" text={eventName} />
      <Form.TextArea key="1" id={"value1"} title={"Value 1"} placeholder="Enter text" />
      <Form.TextArea key="2" id={"value2"} title={"Value 2"} placeholder="Enter text" />
      <Form.TextArea key="3" id={"value3"} title={"Value 3"} placeholder="Enter text" />
    </Form>
  );
}
