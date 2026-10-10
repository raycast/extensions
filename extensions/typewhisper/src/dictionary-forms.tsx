import {
  Action,
  ActionPanel,
  Form,
  showToast,
  Toast,
  useNavigation,
} from "@raycast/api";
import { useState } from "react";
import { apiDeleteJson, apiPutJson, errorMessage } from "./api";

export async function addDictionaryTerm(term: string): Promise<void> {
  await apiPutJson("/v1/dictionary/terms", {
    terms: [term],
    replace: false,
  });
}

export function AddTermForm(props: {
  initialTerm?: string;
  onAdded?: () => void;
}) {
  const { pop } = useNavigation();
  const [termError, setTermError] = useState<string | undefined>();

  async function submit(values: { term: string }) {
    const term = values.term.trim();
    if (!term) {
      setTermError("Enter a term");
      return;
    }
    try {
      await addDictionaryTerm(term);
      await showToast({
        style: Toast.Style.Success,
        title: `Added "${term}"`,
      });
      props.onAdded?.();
      pop();
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: errorMessage(error, "Failed to add term"),
      });
    }
  }

  return (
    <Form
      navigationTitle="Add Term"
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Add Term" onSubmit={submit} />
        </ActionPanel>
      }
    >
      <Form.TextField
        id="term"
        title="Term"
        placeholder="TypeWhisper"
        info="A name or word the speech engine should recognize."
        defaultValue={props.initialTerm}
        error={termError}
        onChange={() => setTermError(undefined)}
      />
    </Form>
  );
}

export function AddCorrectionForm(props: {
  initialOriginal?: string;
  initialReplacement?: string;
  initialCaseSensitive?: boolean;
  onAdded?: () => void;
}) {
  const { pop } = useNavigation();
  const [originalError, setOriginalError] = useState<string | undefined>();
  const isEditing = props.initialOriginal !== undefined;

  async function submit(values: {
    original: string;
    replacement: string;
    caseSensitive: boolean;
  }) {
    const original = values.original.trim();
    if (!original) {
      setOriginalError("Enter the text to replace");
      return;
    }
    try {
      await apiPutJson("/v1/dictionary/corrections", {
        original,
        replacement: values.replacement,
        caseSensitive: values.caseSensitive,
      });
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: errorMessage(error, "Failed to save correction"),
      });
      return;
    }

    // Corrections are keyed by their original text, so renaming one adds a
    // new entry; remove the old one. The new entry is already saved, so a
    // failure here must say which old entry is left over.
    const previousOriginal = props.initialOriginal;
    if (
      previousOriginal !== undefined &&
      previousOriginal.toLowerCase() !== original.toLowerCase()
    ) {
      try {
        await apiDeleteJson("/v1/dictionary/corrections", {
          original: previousOriginal,
        });
      } catch (error) {
        props.onAdded?.();
        await showToast({
          style: Toast.Style.Failure,
          title: `Saved "${original}", but "${previousOriginal}" is still in the dictionary`,
          message:
            `Delete "${previousOriginal}" in Manage Dictionary. ${errorMessage(error, "")}`.trim(),
        });
        pop();
        return;
      }
    }

    await showToast({
      style: Toast.Style.Success,
      title: isEditing ? "Correction updated" : "Correction added",
    });
    props.onAdded?.();
    pop();
  }

  return (
    <Form
      navigationTitle={isEditing ? "Edit Correction" : "Add Correction"}
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title={isEditing ? "Save Correction" : "Add Correction"}
            onSubmit={submit}
          />
        </ActionPanel>
      }
    >
      <Form.TextField
        id="original"
        title="Replace"
        placeholder="type whisper"
        info="Text as it appears in the transcription."
        defaultValue={props.initialOriginal}
        error={originalError}
        onChange={() => setOriginalError(undefined)}
      />
      <Form.TextField
        id="replacement"
        title="With"
        placeholder="TypeWhisper"
        defaultValue={props.initialReplacement}
      />
      <Form.Checkbox
        id="caseSensitive"
        label="Case sensitive"
        defaultValue={props.initialCaseSensitive ?? false}
      />
    </Form>
  );
}
