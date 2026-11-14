import {
  Action,
  ActionPanel,
  Detail,
  Form,
  Icon,
  getFrontmostApplication,
  getSelectedText,
  openExtensionPreferences,
} from "@raycast/api";
import { FormValidation, useForm, usePromise } from "@raycast/utils";

export interface Source {
  text: string;
  frontApp: string;
}

async function readSource(): Promise<Source> {
  // Capture once at launch, before navigating to a picker or form. Unsupported
  // selections fall back to manual entry without reading clipboard history.
  const [selection, app] = await Promise.allSettled([
    getSelectedText(),
    getFrontmostApplication(),
  ]);
  return {
    text: selection.status === "fulfilled" ? selection.value : "",
    frontApp: app.status === "fulfilled" ? app.value.name : "",
  };
}

export function useSource() {
  return usePromise(readSource).data;
}

export function SourceLoading() {
  return <Detail isLoading markdown="Reading selected text…" />;
}

interface SourceFormValues {
  text: string;
  instruction: string;
}

export function SourceForm({
  source,
  onSubmit,
  instruction: initialInstruction,
  custom = false,
}: {
  source: Source;
  onSubmit: (source: Source, instruction?: string) => void;
  instruction?: string;
  custom?: boolean;
}) {
  const { handleSubmit, itemProps } = useForm<SourceFormValues>({
    initialValues: { text: source.text, instruction: initialInstruction || "" },
    validation: {
      text: FormValidation.Required,
      instruction: custom ? FormValidation.Required : undefined,
    },
    onSubmit: ({ text, instruction }) =>
      onSubmit({ ...source, text }, instruction),
  });
  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="Rewrite Text"
            icon={Icon.Wand}
            onSubmit={(values: SourceFormValues) =>
              handleSubmit({
                // Reject whitespace-only fields while retaining the exact source
                // formatting for any nonempty selection.
                text: values.text?.trim() ? values.text : "",
                instruction: values.instruction?.trim() || "",
              })
            }
          />
          <Action
            title="Open Extension Preferences"
            icon={Icon.Gear}
            onAction={openExtensionPreferences}
            shortcut={{ modifiers: ["cmd", "shift"], key: "," }}
          />
        </ActionPanel>
      }
    >
      {custom ? (
        <Form.TextField
          title="Instruction"
          placeholder="Make it shorter, translate to Spanish, turn into bullet points…"
          {...itemProps.instruction}
        />
      ) : null}
      <Form.TextArea
        title="Text"
        placeholder="Select text in another app before opening Recast, or paste it here…"
        {...itemProps.text}
      />
      <Form.Description
        title="Your AWS Account"
        text="Text is sent directly to Amazon Bedrock using your AWS credentials. AWS usage charges apply. Recast does not save a rewrite history."
      />
    </Form>
  );
}
