import { showToast, ToastStyle, preferences, Form, ActionPanel, Icon, SubmitFormAction } from "@raycast/api";
import { Client, Results, CompleteAction } from "sabnzbd-api";

export default function Command() {
  return (
    <Form
      actions={
        <ActionPanel>
          <ChangeCompleteActionAction />
        </ActionPanel>
      }
    >
      <Form.Dropdown id="action" title="Action" storeValue defaultValue={CompleteAction.ShutdownProgram}>
        <Form.Dropdown.Item value={CompleteAction.ShutdownProgram} title="Shutdown Program" />
        <Form.Dropdown.Item value={CompleteAction.HibernatePC} title="Hibernate PC" />
        <Form.Dropdown.Item value={CompleteAction.StandbyPC} title="Standby PC" />
      </Form.Dropdown>
    </Form>
  );
}

function ChangeCompleteActionAction() {
  async function handleSubmit(values: any) {
    const client = new Client(preferences.url.value as string, preferences.apiToken.value as string);

    try {
      const results = (await client.changeCompleteAction(values.action)) as Results;
      showToast(ToastStyle.Success, "Changed complete action");
    } catch (error) {
      console.error(error);
      showToast(ToastStyle.Failure, "Could not change complete action");
    }
  }

  return <SubmitFormAction icon={Icon.Gear} title="Change Complete Action" onSubmit={handleSubmit} />;
}
