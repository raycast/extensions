import { Form, ActionPanel, Action, useNavigation, showHUD } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import { setBatteryLimit } from "./utils/batteryTools";
import { setBatteryThreshold } from "./utils";

interface CommandForm {
  limit: string;
}

export default function Command() {
  const { pop } = useNavigation();

  async function handleSubmit(values: CommandForm) {
    try {
      const limit = Number.parseInt(values.limit, 10);
      if (isNaN(limit) || limit < 0 || limit > 100) {
        await showHUD("Error: Limit must be a number between 0 and 100");
        return;
      }

      // Use both functions to ensure compatibility with both implementations
      try {
        await setBatteryLimit(limit);
      } catch (e) {
        // Fallback to the old implementation if the new one fails
        try {
          await setBatteryThreshold(limit, `🔋 Limiting charging above: `);
        } catch (error) {
          showFailureToast(error, { title: "Could not set battery limit" });
        }
      }

      await showHUD(`Battery charge limit set to ${limit}%`);

      // Return to the root view after successfully setting the limit
      pop();
    } catch (error) {
      console.error("Error setting battery limit:", error);
      showFailureToast(error, { title: "Could not set battery limit" });
    }
  }

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Set Limit" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField
        id="limit"
        title="Charge Limit"
        placeholder="Enter a value between 0 and 100"
        info="Set the maximum battery charge limit as a percentage. Only numeric values are allowed."
        defaultValue="80"
        autoFocus
      />
    </Form>
  );
}
