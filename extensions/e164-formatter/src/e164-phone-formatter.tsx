import { Action, ActionPanel, Clipboard, Form, Icon, showToast, Toast } from "@raycast/api";
import { useState } from "react";

export default function Command() {
  const [formattedNumber, setFormattedNumber] = useState("");

  return (
    <Form
      actions={
        <ActionPanel>
          <FormatPhoneAction />
        </ActionPanel>
      }
    >
      <Form.TextField
        id="phone"
        title="Phone Number"
        placeholder="Enter phone number to format to E.164..."
        onChange={(value) => {
          const digits = value.replace(/\D/g, "");
          const formatted = !digits.startsWith("1") ? "+1" + digits : "+" + digits;
          setFormattedNumber(formatted);
        }}
      />
      <Form.Description text={formattedNumber || "Enter a number to see preview"} />
    </Form>
  );
}

function FormatPhoneAction() {
  async function handleSubmit(values: { phone: string }) {
    if (!values.phone) {
      showToast({
        style: Toast.Style.Failure,
        title: "Phone number is required",
      });
      return;
    }

    const toast = await showToast({
      style: Toast.Style.Animated,
      title: "Formatting phone number",
    });

    try {
      // Remove all non-digit characters
      const digits = values.phone.replace(/\D/g, "");

      // Check if the number starts with a country code
      let formattedNumber = digits;
      if (!digits.startsWith("1") && !digits.startsWith("44") && !digits.startsWith("33") && !digits.startsWith("49")) {
        // If no country code, assume US/Canada (+1)
        formattedNumber = "1" + digits;
      }

      // Add the plus sign
      formattedNumber = "+" + formattedNumber;

      await Clipboard.copy(formattedNumber);

      toast.style = Toast.Style.Success;
      toast.title = "Formatted phone number";
      toast.message = "Copied to clipboard";
    } catch (error) {
      toast.style = Toast.Style.Failure;
      toast.title = "Failed to format phone number";
      toast.message = String(error);
    }
  }

  return <Action.SubmitForm icon={Icon.Check} title="Format Phone Number" onSubmit={handleSubmit} />;
}
