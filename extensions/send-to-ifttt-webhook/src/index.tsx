import { Form, ActionPanel, Action, showToast, getPreferenceValues, showHUD, popToRoot, List } from "@raycast/api";
import fetch from "node-fetch";

interface CommandForm {
  eventName: string;
  value1: string;
  value2: string;
  value3: string;
}

export default function Command() {
  const { eventName1, eventName2, eventName3, eventName4, eventName5, webhooksKey } = getPreferenceValues<{
    eventName1: string;
    eventName2: string;
    eventName3: string;
    eventName4: string;
    eventName5: string;
    webhooksKey: string;
    nbValues: string;
  }>();
  async function handleSubmit(values: CommandForm) {
    const { eventName, value1, value2, value3 } = values;
    try {
      await fetch(`https://maker.ifttt.com/trigger/${eventName}/with/key/${webhooksKey}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ value1, value2, value3 }),
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
          <Action.SubmitForm title="Send" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.Dropdown title="Event Name" id="eventName" storeValue>
        {[eventName1, eventName2, eventName3, eventName4, eventName5].map((eventName, index) =>
          eventName ? <List.Dropdown.Item key={index} title={eventName} value={eventName} /> : null
        )}
      </Form.Dropdown>
      <Form.TextArea key="1" id={"value1"} title={"Value 1"} placeholder="Enter text" />
      <Form.TextArea key="2" id={"value2"} title={"Value 2"} placeholder="Enter text" />
      <Form.TextArea key="3" id={"value3"} title={"Value 3"} placeholder="Enter text" />
    </Form>
  );
}
