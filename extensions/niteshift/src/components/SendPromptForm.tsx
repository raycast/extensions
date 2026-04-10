// src/components/SendPromptForm.tsx
import { Action, ActionPanel, Form, Icon, Toast, popToRoot, showToast } from "@raycast/api";
import { FormValidation, showFailureToast, useForm } from "@raycast/utils";
import type { ApiClient } from "../api/client";
import type { Repository, Task } from "../api/types";

interface Props {
  client: ApiClient;
  task: Task;
  repo?: Repository;
}

/**
 * Form for sending a follow-up prompt to an existing task. Pushed onto the
 * navigation stack from List Tasks's ⌘K menu via Action.Push.
 */
export function SendPromptForm({ client, task, repo }: Props) {
  const { handleSubmit, itemProps } = useForm<{ prompt: string }>({
    onSubmit: async (vals) => {
      const toast = await showToast({ style: Toast.Style.Animated, title: "Sending prompt…" });
      try {
        const res = await client.post<{ accepted: boolean }>(`/api/task/${task.id}/claude/prompt`, {
          prompt: vals.prompt,
        });
        if (!res.accepted) {
          throw new Error("Prompt was not accepted by the task");
        }
        toast.style = Toast.Style.Success;
        toast.title = "Prompt sent";
        // popToRoot tears down the entire navigation stack (form + list), so
        // an explicit pop() of the form is unnecessary.
        await popToRoot({ clearSearchBar: true });
        return true;
      } catch (error) {
        await showFailureToast(error, { title: "Failed to send prompt" });
        toast.hide();
        return false;
      }
    },
    validation: { prompt: FormValidation.Required },
  });

  const taskUrl = repo ? client.taskUrl(repo.fullName, task.id) : "";

  return (
    <Form
      navigationTitle={`Prompt: ${task.name || task.id}`}
      actions={
        <ActionPanel>
          <Action.SubmitForm icon={Icon.SpeechBubble} title="Send Prompt" onSubmit={handleSubmit} />
          {taskUrl && <Action.OpenInBrowser url={taskUrl} />}
        </ActionPanel>
      }
    >
      <Form.Description title="Task" text={task.name || task.id} />
      {repo && <Form.Description title="Repository" text={repo.fullName} />}
      <Form.TextArea
        title="Prompt"
        placeholder="Type your follow-up prompt…"
        {...itemProps.prompt}
      />
    </Form>
  );
}
