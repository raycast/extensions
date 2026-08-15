import {
  Action,
  ActionPanel,
  Clipboard,
  Form,
  Icon,
  LaunchProps,
  showToast,
  Toast,
  useNavigation,
} from "@raycast/api";
import { useState, useCallback } from "react";
import { TemplateResultView } from "./message-template";

type Arguments = {
  jobDescription?: string;
};

export default function ConnectionTemplateCommand(
  props: LaunchProps<{ arguments: Arguments }>,
) {
  return (
    <ConnectionTemplateForm
      initialJobDescription={props.arguments.jobDescription ?? ""}
    />
  );
}

function ConnectionTemplateForm({
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
          templateType="connection"
        />,
      );
    },
    [push],
  );

  return (
    <Form
      navigationTitle="Generate Connection Request"
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="Generate Connection Request"
            onSubmit={handleSubmit}
            icon={Icon.AddPerson}
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
        text="LinkedIn connection requests are limited to ~150 characters. This generates a concise, personalized message."
      />
    </Form>
  );
}
