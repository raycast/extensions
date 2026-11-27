import { Action, ActionPanel, AI, Form, Icon, showToast, Toast, useNavigation } from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { useState } from "react";
import { RecordingAIView } from "./components/RecordingAIView";
import { AI_MODEL_SECTIONS } from "./lib/ai-models";
import { AI_TASKS, AITaskId } from "./lib/ai-tasks";
import { selectedFinderFiles } from "./lib/files";
import { LANGUAGES } from "./lib/options";

type FormValues = {
  files: string[];
  task: AITaskId;
  language?: string;
  answerLanguage?: string;
  model: string;
  customPrompt?: string;
};

/** Dropdown value meaning "answer in the recording's language" / "Raycast's default model". */
const SAME_AS_RECORDING = "";
const DEFAULT_MODEL = "";

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
        answerLanguage={values.answerLanguage || undefined}
        model={values.model ? (values.model as AI.Model) : undefined}
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
      {task !== "translate" && (
        <Form.Dropdown id="answerLanguage" title="Answer Language" defaultValue={SAME_AS_RECORDING} storeValue>
          <Form.Dropdown.Item value={SAME_AS_RECORDING} title="Same as Recording" />
          {LANGUAGES.filter((language) => language.code !== "auto").map((language) => (
            <Form.Dropdown.Item key={language.code} value={language.title} title={language.title} />
          ))}
        </Form.Dropdown>
      )}
      <Form.Dropdown id="model" title="AI Model" defaultValue={DEFAULT_MODEL} storeValue>
        <Form.Dropdown.Item value={DEFAULT_MODEL} title="Raycast AI Default" />
        {AI_MODEL_SECTIONS.map((section) => (
          <Form.Dropdown.Section key={section.provider} title={section.provider}>
            {section.models.map((model) => (
              <Form.Dropdown.Item key={model.value} value={model.value} title={model.title} />
            ))}
          </Form.Dropdown.Section>
        ))}
      </Form.Dropdown>
      {task === "custom" && (
        <Form.TextArea id="customPrompt" title="Prompt" placeholder="List every product name mentioned…" storeValue />
      )}
    </Form>
  );
}
