import { Form, ActionPanel, Action, showToast, closeMainWindow } from "@raycast/api";
import { DisableDuration, disableFluxForDuration } from "./flux-api";
import { DEFAULT_ERROR_TOAST } from "./constants";

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
      await showToast(DEFAULT_ERROR_TOAST);
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
        <Form.Dropdown.Item value={DisableDuration.ForAnHour} title={DisableDuration.ForAnHour} />
        <Form.Dropdown.Item value={DisableDuration.UntilSunrise} title={DisableDuration.UntilSunrise} />
        <Form.Dropdown.Item value={DisableDuration.ForFullScreenApps} title={DisableDuration.ForFullScreenApps} />
        <Form.Dropdown.Item value={DisableDuration.ForCurrentApp} title={DisableDuration.ForCurrentApp} />
      </Form.Dropdown>
    </Form>
  );
}
