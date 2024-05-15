import { Action, ActionPanel, Form, getSelectedFinderItems, Icon, showToast, Toast, useNavigation } from "@raycast/api";
import { useMemo, useState } from "react";
import { DEFAULT_MODEL } from "../../hooks/useModel";
import { QuestionFormProps } from "../../type";
import { checkFileValidity } from "../../utils";
import { showFailureToast } from "@raycast/utils";

export const QuestionForm = ({
  initialQuestion,
  selectedModel,
  models,
  onModelChange,
  onSubmit,
}: QuestionFormProps) => {
  const { pop } = useNavigation();

  const [question, setQuestion] = useState<string>(initialQuestion ?? "");
  const [error, setError] = useState<{ question: string }>({
    question: "",
  });

  const separateDefaultModel = models.filter((x) => x.id !== "default");
  const defaultModel = models.find((x) => x.id === "default") ?? DEFAULT_MODEL;

  const visionMap = useMemo(() => {
    const map = new Map<string, boolean>();
    models.forEach((m) => map.set(m.id, m.vision || false));
    return map;
  }, [models]);

  const [files, setFiles] = useState<string[]>([]);
  const [enableVision, setEnableVision] = useState(visionMap.get(selectedModel) || false);

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="Submit"
            icon={Icon.Checkmark}
            onSubmit={() => {
              // check file is validate
              try {
                for (const file of files) {
                  checkFileValidity(file);
                }
                onSubmit(question, files);
                pop();
              } catch (err) {
                showFailureToast(err, { title: "Invalid file" });
              }
            }}
          />
          {enableVision && (
            <Action
              title="Upload Selected Files"
              shortcut={{
                modifiers: ["cmd"],
                key: ".",
              }}
              icon={Icon.Plus}
              onAction={async () => {
                try {
                  const fileSystemItems = await getSelectedFinderItems();
                  setFiles(fileSystemItems.map((item) => item.path));
                } catch (error) {
                  await showToast({
                    style: Toast.Style.Failure,
                    title: "Cannot copy file path",
                    message: String(error),
                  });
                }
              }}
            />
          )}
        </ActionPanel>
      }
    >
      <Form.TextArea
        id="question"
        title="Question"
        placeholder="Type your question here"
        error={error.question.length > 0 ? error.question : undefined}
        onChange={setQuestion}
        value={question}
        onBlur={(event) => {
          if (event.target.value?.length == 0) {
            setError({ ...error, question: "Required" });
          } else {
            if (error.question && error.question.length > 0) {
              setError({ ...error, question: "" });
            }
          }
        }}
      />
      <Form.Dropdown
        id="model"
        title="Model"
        placeholder="Choose model"
        defaultValue={selectedModel}
        onChange={(id) => {
          setEnableVision(visionMap.get(id) || false);
          onModelChange(id);
        }}
      >
        {defaultModel && <Form.Dropdown.Item key={defaultModel.id} title={defaultModel.name} value={defaultModel.id} />}
        <Form.Dropdown.Section title="Custom Models">
          {separateDefaultModel.map((model) => (
            <Form.Dropdown.Item value={model.id} title={model.name} key={model.id} />
          ))}
        </Form.Dropdown.Section>
      </Form.Dropdown>

      {enableVision && (
        <Form.FilePicker
          id="attachments"
          title="Attachments"
          value={files}
          onChange={setFiles}
          info="Currently support PNG (.png), JPEG (.jpeg and .jpg), WEBP (.webp), and non-animated GIF (.gif)."
        />
      )}
    </Form>
  );
};
