import { Action, ActionPanel, Form, getPreferenceValues, Icon, showToast, Toast, useNavigation } from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { useState } from "react";
import { basename } from "node:path";
import {
  FormatDropdown,
  LanguageDropdown,
  ModelDropdown,
  TriStateDropdown,
} from "./components/TranscriptionOptionFields";
import { StreamingTranscriptView } from "./components/StreamingTranscriptView";
import { TranscriptDetail, TranscriptResult } from "./components/TranscriptDetail";
import { selectedFinderFiles } from "./lib/files";
import { errorMessage, OutputFormat, transcribeFile } from "./lib/mw";
import { fromTriState } from "./lib/options";

type FormValues = {
  files: string[];
  model: string;
  language: string;
  format: OutputFormat;
  speakers: string;
  timestamps: string;
  persist: boolean;
};

export default function Command() {
  const { push } = useNavigation();
  const [isLoading, setIsLoading] = useState(false);
  const { data: selection, isLoading: isLoadingFinder } = usePromise(selectedFinderFiles);

  async function handleSubmit(values: FormValues) {
    if (values.files.length === 0) {
      await showToast({ style: Toast.Style.Failure, title: "Pick at least one file" });
      return;
    }

    // A single plain-text transcript with default export options can be streamed as it is produced.
    const canStream =
      values.files.length === 1 &&
      values.format === "txt" &&
      values.speakers === "default" &&
      values.timestamps === "default";
    if (canStream) {
      push(
        <StreamingTranscriptView
          path={values.files[0]}
          options={{ model: values.model, language: values.language, persist: values.persist }}
        />,
      );
      return;
    }

    setIsLoading(true);
    const toast = await showToast({ style: Toast.Style.Animated, title: "Transcribing…" });
    const results: TranscriptResult[] = [];
    try {
      for (const [index, path] of values.files.entries()) {
        toast.message = `${index + 1}/${values.files.length} — ${basename(path)}`;
        const transcript = await transcribeFile(path, {
          model: values.model,
          language: values.language,
          format: values.format,
          speakers: fromTriState(values.speakers),
          timestamps: fromTriState(values.timestamps),
          persist: values.persist,
        });
        results.push({ path, transcript });
      }
      toast.style = Toast.Style.Success;
      toast.title = results.length === 1 ? "Transcription complete" : `${results.length} files transcribed`;
      toast.message = undefined;
      push(<TranscriptDetail results={results} format={values.format} />);
    } catch (error) {
      toast.style = Toast.Style.Failure;
      toast.title = "Transcription failed";
      toast.message = errorMessage(error);
    } finally {
      setIsLoading(false);
    }
  }

  // Wait for Finder so the file field gets its default value on first render.
  if (isLoadingFinder) return <Form isLoading />;

  return (
    <Form
      isLoading={isLoading}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Transcribe" icon={Icon.Microphone} onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.FilePicker
        id="files"
        title="Audio or Video"
        allowMultipleSelection
        canChooseDirectories={false}
        defaultValue={selection ?? []}
      />
      <ModelDropdown />
      <LanguageDropdown />
      <FormatDropdown />
      <Form.Separator />
      <TriStateDropdown id="speakers" title="Speaker Detection" />
      <TriStateDropdown id="timestamps" title="Timestamps" />
      <Form.Checkbox
        id="persist"
        title="History"
        label="Save to MacWhisper history"
        defaultValue={getPreferenceValues<Preferences>().saveToHistory}
      />
    </Form>
  );
}
