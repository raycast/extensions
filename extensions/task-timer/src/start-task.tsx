import {
  Action,
  ActionPanel,
  Form,
  Icon,
  LaunchProps,
  LaunchType,
  Toast,
  launchCommand,
  popToRoot,
  showHUD,
  showToast,
} from "@raycast/api";
import { useState } from "react";
import { discardTask, startTask } from "./session";

type Values = { task: string; minutes: string };
type Context = { task?: string; minutes?: string };

export default function Command(props: LaunchProps<{ launchContext?: Context }>) {
  const [isLoading, setIsLoading] = useState(false);

  async function handleSubmit(values: Values) {
    setIsLoading(true);
    try {
      const session = await startTask(values.task, values.minutes);
      const id = session.id ?? String(session.startedAt);
      try {
        await launchCommand({ name: "task-timer", type: LaunchType.Background });
      } catch (error) {
        await discardTask(id);
        throw error;
      }
      await popToRoot();
      await showHUD(`Started: ${session.taskName} · ${session.durationMinutes} min`);
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Could not start task",
        message: error instanceof Error ? error.message : String(error),
      });
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <Form
      isLoading={isLoading}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Start Task" icon={Icon.Play} onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField
        id="task"
        title="Task"
        placeholder="Prepare project update"
        defaultValue={props.launchContext?.task}
      />
      <Form.TextField id="minutes" title="Minutes" placeholder="25" defaultValue={props.launchContext?.minutes} />
    </Form>
  );
}
