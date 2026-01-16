import { Form, ActionPanel, Action, showToast, closeMainWindow, Toast } from "@raycast/api";
import { DisableDuration, disableFluxForDuration } from "./flux-api";

type Values = {
  duration: DisableDuration;
};

export default function Command() {
  async function handleSubmit(values: Values) {
    await closeMainWindow();
    const success = await disableFluxForDuration(values.duration);

    if (success) {
      await showToast({ title: `f.lux disabled ${values.duration}` });
    } else {
      await showToast({
        style: Toast.Style.Failure,
        title: `Failed to access f.lux`,
        message: `Make sure f.lux is running.`,
      });
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
      <Form.Dropdown id="duration" title="Disable f.lux">
        <Form.Dropdown.Item value="for an hour" title="for an hour" />
        <Form.Dropdown.Item value="until sunrise" title="until sunrise" />
        <Form.Dropdown.Item value="for full-screen apps" title="for full-screen apps" />
        <Form.Dropdown.Item value="for current app" title="for current app" />
      </Form.Dropdown>
    </Form>
  );
}
