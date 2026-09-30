import {
  Action,
  ActionPanel,
  Form,
  getSelectedFinderItems,
  Icon,
  showToast,
  Toast,
  useNavigation,
  Clipboard,
} from "@raycast/api";
import { useCallback, useEffect, useMemo, useState } from "react";
import { DEFAULT_MODEL } from "../../hooks/useModel";
import { QuestionFormProps } from "../../type";
import { checkFileValidity, formats } from "../../utils";
import path from "node:path";

export const QuestionForm = ({
  initialQuestion,
  selectedModel,
  models,
  onModelChange,
  onSubmit,
  isFirstCall,
}: QuestionFormProps) => {
  const { pop } = useNavigation();

  const [question, setQuestion] = useState<string>(initialQuestion ?? "");
  const [questionError, setQuestionError] = useState<string | undefined>();
  const [attachmentError, setAttachmentError] = useState<string | undefined>();

  const separateDefaultModel = models.filter((x) => x.id !== "default");
  const defaultModel = models.find((x) => x.id === "default") ?? DEFAULT_MODEL;

  const visionMap = useMemo(() => {
    const map = new Map<string, boolean>();
    models.forEach((m) => map.set(m.id, m.vision || false));
    return map;
  }, [models]);

  const [files, setFiles] = useState<string[]>([]);
  const [enableVision, setEnableVision] = useState(visionMap.get(selectedModel) || false);

  const addFromSelected = useCallback(
    (errCallback?: (reason: unknown) => void | Promise<void>) => {
      getSelectedFinderItems()
        .then((items) => items.map((item) => item.path))
        .then((p) => setFiles(p.sort()))
        .catch(errCallback);
    },
    [setFiles],
  );

  const addFromClipboard = useCallback(async () => {
    const { text, file } = await Clipboard.read();
    // console.log(`text`, text);
    // console.log(`file`, file);
    if (file && (text.startsWith("Image") || Object.keys(formats).includes(path.extname(file)))) {
      setFiles((files) => [...new Set([...files, file!])].sort());
    }
  }, [setFiles]);

  useEffect(() => {
    if (isFirstCall && enableVision) {
      addFromSelected(() => {});
      addFromClipboard();
    }
  }, []);

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="Submit"
            icon={Icon.Checkmark}
            onSubmit={async () => {
              if (question.length === 0) {
                setQuestionError("Required");
                return;
              }
              let searchFiles: string[] = [];
              if (enableVision) {
                // If the model not enable vision, don't pass files to API
                if (!validateAttachments(files)) {
                  setAttachmentError("Contain Invalid File");
                  return;
                }
                searchFiles = files;
              }
              onSubmit(question, searchFiles);
              pop();
            }}
          />
          {enableVision && (
            <>
              <Action
                title="Upload Selected Files"
                shortcut={{
                  modifiers: ["cmd"],
                  key: ".",
                }}
                icon={Icon.Plus}
                onAction={() =>
                  addFromSelected(async (error) => {
                    await showToast({
                      style: Toast.Style.Failure,
                      title: "Cannot copy file path",
                      message: String(error),
                    });
                  })
                }
              />
              <Action
                title="Upload Clipboard File"
                shortcut={{
                  modifiers: ["shift", "cmd"],
                  key: ".",
                }}
                icon={Icon.Clipboard}
                onAction={addFromClipboard}
              />
            </>
          )}
        </ActionPanel>
      }
    >
      <Form.TextArea
        id="question"
        title="Question"
        placeholder="Type your question here"
        error={questionError}
        onChange={(q) => {
          if (questionError && questionError.length > 0) {
            setQuestionError(undefined);
          }
          setQuestion(q);
        }}
        value={question}
        onBlur={(e) => {
          if (e.target.value && e.target.value.length > 0) {
            setQuestionError(undefined);
          } else {
            setQuestionError("Required");
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
          error={attachmentError}
          onChange={(files) => {
            if (attachmentError && attachmentError.length > 0) {
              setAttachmentError(undefined);
            }
            if (enableVision && files && files.length > 0) {
              if (!validateAttachments(files)) {
                setAttachmentError("Contain Invalid File");
              }
            }
            setFiles(files);
          }}
          onBlur={() => {
            if (attachmentError && attachmentError.length > 0) {
              setAttachmentError(undefined);
            }
          }}
          info="Currently support PNG (.png), JPEG (.jpeg and .jpg), WEBP (.webp), and non-animated GIF (.gif)."
        />
      )}
    </Form>
  );
};

const validateAttachments = (files: string[]) => {
  for (const file of files) {
    if (path.extname(file) === "") {
      // this is clipboard image file
      continue;
    }
    if (checkFileValidity(file)) {
      continue;
    }
    return false;
  }
  return true;
};
