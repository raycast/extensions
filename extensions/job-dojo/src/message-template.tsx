import {
  Action,
  ActionPanel,
  Clipboard,
  Detail,
  Form,
  Icon,
  LaunchProps,
  showToast,
  Toast,
  useNavigation,
} from "@raycast/api";
import { useState, useCallback, useEffect } from "react";
import { streamChat } from "./api";

type Arguments = {
  jobDescription?: string;
};

export default function MessageTemplateCommand(
  props: LaunchProps<{ arguments: Arguments }>,
) {
  return (
    <MessageTemplateForm
      initialJobDescription={props.arguments.jobDescription ?? ""}
    />
  );
}

function MessageTemplateForm({
  initialJobDescription = "",
}: {
  initialJobDescription?: string;
}) {
  const [jobDescription, setJobDescription] = useState(initialJobDescription);
  const { push } = useNavigation();

  const handleSubmit = useCallback(
    async (values: { jobDescription: string }) => {
      if (!values.jobDescription.trim()) {
        showToast({
          style: Toast.Style.Failure,
          title: "Please enter a job description",
        });
        return;
      }

      push(
        <TemplateResultView
          jobDescription={values.jobDescription}
          templateType="message"
        />,
      );
    },
    [push],
  );

  return (
    <Form
      navigationTitle="Generate Recruiter Message"
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="Generate Message"
            onSubmit={handleSubmit}
            icon={Icon.Envelope}
          />
          <Action
            title="Paste from Clipboard"
            icon={Icon.Clipboard}
            shortcut={{ modifiers: ["cmd", "shift"], key: "v" }}
            onAction={async () => {
              const text = await Clipboard.readText();
              if (text) {
                setJobDescription(text);
              }
            }}
          />
        </ActionPanel>
      }
    >
      <Form.TextArea
        id="jobDescription"
        title="Job Description"
        placeholder="Paste the job description here..."
        value={jobDescription}
        onChange={setJobDescription}
        enableMarkdown
      />
      <Form.Description
        title="Tip"
        text="Copy a job description and paste it here to generate a personalized recruiter message."
      />
    </Form>
  );
}

function TemplateResultView({
  jobDescription,
  templateType,
}: {
  jobDescription: string;
  templateType: "message" | "connection";
}) {
  const [result, setResult] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchTemplate = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    setResult("");

    try {
      const generator = streamChat(jobDescription, {
        command: templateType,
      });

      let generated = "";
      let response = await generator.next();

      while (!response.done) {
        if (response.value) {
          generated += response.value;
          setResult(generated);
        }
        response = await generator.next();
      }

      if (!generated.trim()) {
        throw new Error("Failed to generate template");
      }

      showToast({
        style: Toast.Style.Success,
        title: "Template Generated",
      });
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "An error occurred";
      setError(errorMessage);
      showToast({
        style: Toast.Style.Failure,
        title: "Error",
        message: errorMessage,
      });
    } finally {
      setIsLoading(false);
    }
  }, [jobDescription, templateType]);

  useEffect(() => {
    fetchTemplate();
  }, [fetchTemplate]);

  const title =
    templateType === "message" ? "Recruiter Message" : "Connection Request";

  const markdown = error
    ? `## Error\n\n${error}`
    : result
      ? `## ${title}\n\n${result}`
      : `## Generating ${title}...\n\n_Please wait while we generate your template..._`;

  return (
    <Detail
      markdown={markdown}
      isLoading={isLoading}
      actions={
        <ActionPanel>
          {result && (
            <Action.CopyToClipboard
              title="Copy Message"
              content={result}
              shortcut={{ modifiers: ["cmd"], key: "c" }}
            />
          )}
          {error && (
            <Action
              title="Retry"
              icon={Icon.RotateClockwise}
              onAction={fetchTemplate}
            />
          )}
        </ActionPanel>
      }
    />
  );
}

export { TemplateResultView };
