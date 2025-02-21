import { showHUD, Form, ActionPanel, Action } from "@raycast/api";
import { isFlowInstalled, setSessionTitle } from "./utils";

export default function SetSessionTitle() {
  const handleSubmit = async (values: { title: string }) => {
    if (!(await isFlowInstalled())) {
      await showHUD("Flow not installed. Install it from: https://flowapp.info/download");
      return;
    }

    try {
      await setSessionTitle(values.title);
      await showHUD(values.title ? `Session title set to: ${values.title}` : "Session title was reset to default");
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      await showHUD(`Failed to set title: ${errorMessage}`);
    }
  };

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Set Title" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField
        id="title"
        title="Session Title"
        placeholder="Enter session title"
        info="Leave blank to reset to default"
      />
    </Form>
  );
}
