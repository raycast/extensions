import { Form, ActionPanel, Action, getPreferenceValues } from "@raycast/api";
import { Preferences } from "./types";
import { useCreateMonitor } from "./hooks/useCreateMonitor";
import { CreateMonitorForm } from "./components/CreateMonitorForm";

export default function Command() {
  const { phareApiKey } = getPreferenceValues<Preferences>();
  const { handleSubmit, itemProps, isLoading } = useCreateMonitor(phareApiKey);

  return (
    <Form
      isLoading={isLoading}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Create Monitor" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <CreateMonitorForm itemProps={itemProps} />
    </Form>
  );
}
