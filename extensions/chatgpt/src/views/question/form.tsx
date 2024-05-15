import { Action, ActionPanel, Form, getSelectedFinderItems, Icon, showToast, Toast, useNavigation } from "@raycast/api";
import { useCallback, useMemo, useState } from "react";
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
  const [error, setError] = useState<{ question: string; attachments: string }>({
    question: "",
    attachments: "",
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

  const addFiles = useCallback(
    (errCallback?: (reason: unknown) => void | Promise<void>) => {
      getSelectedFinderItems()
        .then((items) => items.map((item) => item.path))
        .then((p) => setFiles(p))
        .catch(errCallback);
    },
    [setFiles]
  );

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="Submit"
            icon={Icon.Checkmark}
            onSubmit={async () => {
              let searchFiles: string[] = [];
              if (enableVision) {
                // If the model not enable vision, don't pass files to API
                try {
                  files.forEach((file) => checkFileValidity(file));
                  searchFiles = files;
                } catch (err) {
                  setError({ ...error, attachments: "Contain Invalid File" });
                  await showFailureToast(err, { title: "Invalid file" });
                  return;
                }
              }
              onSubmit(question, searchFiles);
              pop();
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
              onAction={() =>
                addFiles(async (error) => {
                  await showToast({
                    style: Toast.Style.Failure,
                    title: "Cannot copy file path",
                    message: String(error),
                  });
                })
              }
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
          error={error.attachments.length > 0 ? error.attachments : undefined}
          onChange={(files) => {
            setError({ ...error, attachments: "" });
            setFiles(files);
          }}
          info="Currently support PNG (.png), JPEG (.jpeg and .jpg), WEBP (.webp), and non-animated GIF (.gif)."
        />
      )}
    </Form>
  );
};
