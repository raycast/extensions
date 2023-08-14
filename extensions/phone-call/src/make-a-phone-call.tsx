import { Action, ActionPanel, closeMainWindow, Form, popToRoot, showToast, Toast } from "@raycast/api";
import open from "open";

interface CommandForm {
  number: string;
}

export default function Command() {
  async function handleSubmit(values: CommandForm) {
    // Remove all non-numeric characters from the input
    values.number = values.number.replace(/\D/g, "");

    // If the input is empty, show an error toast and return
    if (values.number.length === 0) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Input Error",
        message: "You must enter a number before setting up a call",
      });
      return;
    }

    // If the input is less than 10 digits, show an error toast and return
    if (values.number.length < 10) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Input Error",
        message: "You must enter a 10 digit number before setting up a call",
      });
      return;
    }

    // If the input is 10 digits, add a +1 to the beginning
    if (values.number.length === 10) {
      values.number = `+1${values.number}`;
    }

    // If the input is 11 digits, add a + to the beginning
    if (values.number.length === 11) {
      values.number = `+${values.number}`;
    }

    // If the input is more than 12 digits, show an error toast and return
    if (values.number.length > 12) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Input Error",
        message: "You must enter a 10 to 12 digit number before setting up a call",
      });
      return;
    }

    await open(`tel:${encodeURIComponent(values.number)}`);
    await popToRoot({ clearSearchBar: true });
    await closeMainWindow();
  }

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm onSubmit={handleSubmit} title="Make a Phone Call" />
        </ActionPanel>
      }
    >
      <Form.TextField id="number" title="Phone Number" placeholder="Enter a phone number" defaultValue="" />
    </Form>
  );
}
