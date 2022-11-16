import { Action, ActionPanel, closeMainWindow, Form, popToRoot, showToast, Toast } from "@raycast/api";
import Style = Toast.Style;
import open from "open";

interface CommandForm {
  number: string;
}

export default function Command() {
  async function handleSubmit(values: CommandForm) {
    if (values.number === "") {
      await showToast({
        style: Style.Failure,
        title: "Input Error",
        message: "You must enter a number before setting up a call",
      });
      return;
    }

    await open(`facetime:${encodeURIComponent(values.number)}`);
    await popToRoot({ clearSearchBar: true });
    await closeMainWindow();
  }

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm onSubmit={handleSubmit} title="Setup Call" />
        </ActionPanel>
      }
    >
      <Form.TextField id="number" title="Number" placeholder="Enter number" defaultValue="" />
    </Form>
  );
}
