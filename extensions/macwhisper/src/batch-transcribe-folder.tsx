import { Action, ActionPanel, Form, Icon, open, showToast, Toast, useNavigation } from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { useState } from "react";
import {
  FormatDropdown,
  LanguageDropdown,
  ModelDropdown,
  TriStateDropdown,
} from "./components/TranscriptionOptionFields";
import { BatchResultsView } from "./components/BatchResultsView";
import { finderFolder } from "./lib/files";
import { errorMessage, OutputFormat, transcribeDirectory } from "./lib/mw";
import { fromTriState } from "./lib/options";

type FormValues = {
  folder: string[];
  outputFolder: string[];
  recursive: boolean;
  overwrite: boolean;
  model: string;
  language: string;
  format: OutputFormat;
  speakers: string;
};

export default function Command() {
  const { push } = useNavigation();
  const [isLoading, setIsLoading] = useState(false);
  const { data: initialFolder, isLoading: isLoadingFinder } = usePromise(finderFolder);

  async function handleSubmit(values: FormValues) {
    const folder = values.folder[0];
    if (!folder) {
      await showToast({ style: Toast.Style.Failure, title: "Pick a folder to transcribe" });
      return;
    }
    const outputDir = values.outputFolder[0] ?? folder;

    setIsLoading(true);
    const toast = await showToast({
      style: Toast.Style.Animated,
      title: "Transcribing folder…",
      message: "This can take a while for long recordings",
    });
    try {
      const written = await transcribeDirectory(folder, {
        outputDir,
        recursive: values.recursive,
        overwrite: values.overwrite,
        model: values.model,
        language: values.language,
        format: values.format,
        speakers: fromTriState(values.speakers),
      });
      toast.style = Toast.Style.Success;
      toast.title = written.length === 1 ? "1 transcript written" : `${written.length} transcripts written`;
      toast.message = outputDir;
      toast.primaryAction = { title: "Open Output Folder", onAction: () => open(outputDir) };
      push(<BatchResultsView files={written} format={values.format} sourceDir={folder} outputDir={outputDir} />);
    } catch (error) {
      toast.style = Toast.Style.Failure;
      toast.title = "Batch transcription failed";
      toast.message = errorMessage(error);
    } finally {
      setIsLoading(false);
    }
  }

  // Wait for Finder so the folder field gets its default value on first render.
  if (isLoadingFinder) return <Form isLoading />;

  return (
    <Form
      isLoading={isLoading}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Transcribe Folder" icon={Icon.Folder} onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      {!initialFolder && (
        <Form.Description text="Tip: open or select the folder in Finder before launching this command to fill it in." />
      )}
      <Form.FilePicker
        id="folder"
        title="Folder"
        allowMultipleSelection={false}
        canChooseDirectories
        canChooseFiles={false}
        defaultValue={initialFolder ? [initialFolder] : []}
      />
      <Form.Checkbox id="recursive" title="Subfolders" label="Include subfolders" defaultValue={false} storeValue />
      <Form.FilePicker
        id="outputFolder"
        title="Output Folder"
        info="Defaults to the source folder"
        allowMultipleSelection={false}
        canChooseDirectories
        canChooseFiles={false}
      />
      <FormatDropdown defaultValue="srt" />
      <Form.Checkbox
        id="overwrite"
        title="Existing Files"
        label="Overwrite existing transcripts"
        defaultValue={false}
      />
      <Form.Separator />
      <ModelDropdown />
      <LanguageDropdown />
      <TriStateDropdown id="speakers" title="Speaker Detection" />
    </Form>
  );
}
