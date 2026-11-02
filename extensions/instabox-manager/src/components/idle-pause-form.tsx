import { Action, ActionPanel, Form, Icon, showToast, Toast, useNavigation } from "@raycast/api";
import { useForm } from "@raycast/utils";
import { useAccountData } from "../hooks/use-account-data";
import { getMe } from "../services/account";
import { updateMachine } from "../services/machines";
import { Machine } from "../types";
import { errorToast, showError } from "../utils/errors";
import { fixedIdleSeconds, idleOptions, idleTitle } from "../utils/idle";

interface IdlePauseFormProps {
  machine: Machine;
  onSaved: () => void;
}

export function IdlePauseForm({ machine, onSaved }: IdlePauseFormProps) {
  const { pop } = useNavigation();
  const { data: me, isLoading } = useAccountData("me", getMe, { onError: errorToast("Could not load your account") });
  const current = String(machine.autoSuspendAfterSeconds ?? 0);
  const choices = me ? idleOptions(me) : [];
  const options =
    choices.length === 0 || choices.some((option) => option.value === current)
      ? choices
      : [...choices, { title: idleTitle(Number(current)), value: current }];

  const { handleSubmit, itemProps } = useForm<{ idle: string }>({
    initialValues: { idle: current },
    async onSubmit(values) {
      if (values.idle === current) return pop();

      const toast = await showToast({ style: Toast.Style.Animated, title: "Saving idle pause…" });
      try {
        const updated = await updateMachine(machine.id, { autoSuspendAfterSeconds: Number(values.idle) });
        toast.style = Toast.Style.Success;
        toast.title = "Saved idle pause";
        // The reply has the time the API applied, which can differ from the one sent.
        toast.message = `Pause when idle: ${idleTitle(updated.autoSuspendAfterSeconds ?? 0)}`;
        onSaved();
        pop();
      } catch (error) {
        await showError(error, { toast, title: "Could not save the idle pause" });
      }
    },
  });

  return (
    <Form
      isLoading={isLoading}
      navigationTitle={`Idle Pause for ${machine.name}`}
      actions={
        choices.length > 0 && (
          <ActionPanel>
            <Action.SubmitForm title="Save Idle Pause" icon={Icon.Clock} onSubmit={handleSubmit} />
          </ActionPanel>
        )
      }
    >
      {choices.length > 0 && (
        <Form.Dropdown {...itemProps.idle} title="Pause When Idle" info="Kept across pause, resume, stop and start">
          {options.map((option) => (
            <Form.Dropdown.Item key={option.value} value={option.value} title={option.title} />
          ))}
        </Form.Dropdown>
      )}
      {me && choices.length === 0 && (
        <Form.Description
          title="Pause When Idle"
          text={`${idleTitle(fixedIdleSeconds(me))} without activity. InstaBox sets this for your account, so it can't be changed here.`}
        />
      )}
    </Form>
  );
}
