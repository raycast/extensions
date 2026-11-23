import { Action, ActionPanel, Form, Icon, showToast, Toast, useNavigation } from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { useState } from "react";
import { RecordingAIView } from "./components/RecordingAIView";
import { AI_TASKS, AITaskId } from "./lib/ai-tasks";
import { selectedFinderFiles } from "./lib/files";

type FormValues = {
  files: string[];
  task: AITaskId;
  language?: string;
  customPrompt?: string;
};

export default function Command() {
  const { push } = useNavigation();
  const [task, setTask] = useState<AITaskId>("summary");
  const { data: selection, isLoading } = usePromise(selectedFinderFiles);

  async function handleSubmit(values: FormValues) {
    if (values.files.length === 0) {
      await showToast({ style: Toast.Style.Failure, title: "Pick a recording" });
      return;
    }
    if (values.task === "custom" && !values.customPrompt?.trim()) {
      await showToast({ style: Toast.Style.Failure, title: "Write what Raycast AI should do" });
      return;
    }
    push(
      <RecordingAIView
        paths={values.files}
        task={values.task}
        language={values.language}
        customPrompt={values.customPrompt}
      />,
    );
  }

  if (isLoading) return <Form isLoading />;

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Ask Raycast AI" icon={Icon.Stars} onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.FilePicker
        id="files"
        title="Recording"
        allowMultipleSelection
        canChooseDirectories={false}
        defaultValue={selection ?? []}
      />
      <Form.Dropdown id="task" title="Task" value={task} onChange={(value) => setTask(value as AITaskId)}>
        {(Object.keys(AI_TASKS) as AITaskId[]).map((id) => (
          <Form.Dropdown.Item key={id} value={id} title={AI_TASKS[id].title} />
        ))}
      </Form.Dropdown>
      {task === "translate" && (
        <Form.TextField id="language" title="Translate Into" placeholder="English" defaultValue="English" storeValue />
      )}
      {task === "custom" && (
        <Form.TextArea id="customPrompt" title="Prompt" placeholder="List every product name mentioned…" storeValue />
      )}
    </Form>
  );
}
