import { Form, ActionPanel, Action, showToast, Toast, open, LaunchProps } from "@raycast/api";
import { isValidPhoneNumber, cleanPhoneNumber } from "./utils/phone-number-utils";

interface CommandForm {
  phoneNumber: string;
}

interface CommandArguments {
  number?: string;
}

export default function Command(props: LaunchProps<{ arguments: CommandArguments }>) {
  const { number: argumentNumber } = props.arguments;

  async function handlePhoneNumber(phoneNumber: string) {
    if (!isValidPhoneNumber(phoneNumber)) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Invalid phone number",
        message: "Please enter a valid phone number.",
      });
      return;
    }

    const cleanedNumber = cleanPhoneNumber(phoneNumber);

    try {
      await open(`tel://${cleanedNumber}`);
      await showToast({
        style: Toast.Style.Success,
        title: "Initiating call",
        message: `Calling ${cleanedNumber}...`,
      });
    } catch (error) {
      console.error("Error initiating call:", error);
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to initiate call",
        message: "Please try again or check your system settings.",
      });
    }
  }

  function handleSubmit(values: CommandForm) {
    handlePhoneNumber(values.phoneNumber);
  }

  // If a number was provided as an argument, use it immediately
  if (argumentNumber) {
    handlePhoneNumber(argumentNumber);
    return null; // Return null to prevent rendering the form
  }

  // Otherwise, show the form
  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Call Number" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField id="phoneNumber" title="Phone Number" placeholder="Enter phone number" />
    </Form>
  );
}
