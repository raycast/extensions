import { Action, ActionPanel, Detail, Form, Icon, LaunchProps, useNavigation } from "@raycast/api";
import { FormValidation, useForm, usePromise } from "@raycast/utils";

import { FxErrorActions } from "./components/fx-error-actions";
import { FxAskResponse, defaultWorkingDirectory, getFxPreferences, runFxJson } from "./lib/fx";

type Arguments = {
  prompt?: string;
};

type FormValues = {
  prompt: string;
  workspace: string[];
  resumeSessionId: string;
};

function AskResult({
  prompt,
  workspace,
  resumeSessionId,
}: {
  prompt: string;
  workspace: string;
  resumeSessionId?: string;
}) {
  const { fxPath } = getFxPreferences();
  const { data, error, isLoading, revalidate } = usePromise(
    async () => {
      const args = ["ask", "--json"];
      if (resumeSessionId) args.push("--resume", resumeSessionId);
      args.push(prompt);
      return runFxJson<FxAskResponse>(fxPath, args, { cwd: workspace, timeoutMs: 30 * 60 * 1000 });
    },
    [],
    { failureToastOptions: { title: "Could Not Ask fx" } },
  );

  const output = data?.output || data?.error || (error ? `# Could Not Ask fx\n\n${error.message}` : "");
  return (
    <Detail
      isLoading={isLoading}
      markdown={output}
      metadata={
        data ? (
          <Detail.Metadata>
            {data.model ? <Detail.Metadata.Label title="Model" text={data.model} /> : null}
            {data.session_id ? <Detail.Metadata.Label title="Session ID" text={data.session_id} /> : null}
            {data.steps !== undefined ? <Detail.Metadata.Label title="Steps" text={String(data.steps)} /> : null}
            {data.usage ? (
              <Detail.Metadata.Label
                title="Tokens"
                text={`${data.usage.input_tokens ?? 0} input · ${data.usage.output_tokens ?? 0} output`}
              />
            ) : null}
            <Detail.Metadata.Label title="Workspace" text={workspace} icon={Icon.Folder} />
          </Detail.Metadata>
        ) : null
      }
      actions={
        error ? (
          <FxErrorActions error={error} retry={revalidate} />
        ) : data ? (
          <ActionPanel>
            <Action.CopyToClipboard title="Copy Response" content={output} />
            {data.session_id ? <Action.CopyToClipboard title="Copy Session ID" content={data.session_id} /> : null}
            <Action title="Run Again" icon={Icon.ArrowClockwise} onAction={revalidate} />
          </ActionPanel>
        ) : undefined
      }
    />
  );
}

export default function Command(props: LaunchProps<{ arguments: Arguments }>) {
  const { defaultWorkspace } = getFxPreferences();
  const { push } = useNavigation();
  const { handleSubmit, itemProps } = useForm<FormValues>({
    initialValues: {
      prompt: props.arguments.prompt || "",
      workspace: defaultWorkspace ? [defaultWorkspace] : [],
      resumeSessionId: "",
    },
    validation: {
      prompt: FormValidation.Required,
      workspace: FormValidation.Required,
    },
    onSubmit(values) {
      push(
        <AskResult
          prompt={values.prompt.trim()}
          workspace={defaultWorkingDirectory(values.workspace[0])}
          resumeSessionId={values.resumeSessionId.trim() || undefined}
        />,
      );
    },
  });

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Ask Fx" icon={Icon.Stars} onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextArea
        title="Prompt"
        placeholder="Explain the current changes and suggest improvements"
        {...itemProps.prompt}
      />
      <Form.FilePicker
        title="Workspace"
        canChooseDirectories
        canChooseFiles={false}
        allowMultipleSelection={false}
        {...itemProps.workspace}
      />
      <Form.Separator />
      <Form.TextField
        title="Resume Session ID"
        placeholder="Optional session ID or last"
        info="Continue an existing fx conversation in this workspace."
        {...itemProps.resumeSessionId}
      />
    </Form>
  );
}
