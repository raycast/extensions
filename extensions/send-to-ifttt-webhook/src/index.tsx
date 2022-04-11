import { Form, ActionPanel, Action, showToast, getPreferenceValues, showHUD, popToRoot } from "@raycast/api";
import fetch from "node-fetch";

interface CommandForm {
  value1: string;
  value2?: string;
  value3?: string;
}

export default function Command() {
  const { eventName, webhooksKey, nbValues } = getPreferenceValues<{ eventName: string; webhooksKey: string, nbValues: string }>();
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
      <Form.Description title="Event Name" text={eventName}/>
      { range(parseInt(nbValues), 1).map(i =>  <Form.TextArea key={i} id={`value${i}`} title={`Value ${i}`} placeholder="Enter text" /> ) }
    </Form>
  );
}

function range(size: number, startAt = 0) {
  return [...Array(size).keys()].map(i => i + startAt);
}
