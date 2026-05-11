import { Form, ActionPanel, Action, showToast, Toast, getPreferenceValues, popToRoot } from "@raycast/api";
import React, { useState } from "react";
import { processTakeout, ProcessConfig } from "./engine";
import path from "path";

interface FormValues {
  inputDir: string[];
  outputDir: string[];
  outputFolderName: string;
  filter: string;

  deleteZips: boolean;
  safeMode: boolean;
}

export default function Command() {
  const preferences = getPreferenceValues<Preferences>();
  const [isLoading, setIsLoading] = useState(false);

  // Validation errors
  const [inputDirError, setInputDirError] = useState<string | undefined>();
  const [outputDirError, setOutputDirError] = useState<string | undefined>();

  // Get default directories from preferences (if set)
  const defaultInputDir = preferences.defaultInputDir;
  const defaultOutputDir = preferences.defaultOutputDir;

  async function handleSubmit(values: FormValues) {
    // Clear previous errors
    setInputDirError(undefined);
    setOutputDirError(undefined);

    // Validate form values
    if (!values.inputDir || values.inputDir.length === 0) {
      setInputDirError("Please select an input folder");
      return;
    }

    if (!values.outputDir || values.outputDir.length === 0) {
      setOutputDirError("Please select an output folder");
      return;
    }

    const inputDir = values.inputDir[0];
    const outputDir = values.outputDir[0];

    // Additional validation
    if (inputDir === outputDir) {
      setOutputDirError("Output folder must be different from input folder");
      return;
    }

    // Check if output is inside input or vice versa
    const normalizedInput = path.normalize(inputDir);
    const normalizedOutput = path.normalize(outputDir);
    if (normalizedOutput.startsWith(normalizedInput)) {
      setOutputDirError("Output folder cannot be inside input folder");
      return;
    }
    if (normalizedInput.startsWith(normalizedOutput)) {
      setInputDirError("Input folder cannot be inside output folder");
      return;
    }

    const config: ProcessConfig = {
      inputDir,
      outputDir,
      filter: values.filter.trim() || "takeout-",
      deleteZips: values.deleteZips,
      safeMode: values.safeMode,
      outputFolderName: values.outputFolderName.trim() || undefined,
    };

    setIsLoading(true);

    let toast: Toast | undefined;

    try {
      // Initialize toast
      toast = await showToast({
        style: Toast.Style.Animated,
        title: "Starting...",
        message: "Initializing merge process",
      });

      // Run the processing engine with progress updates
      const stats = await processTakeout(config, (stage: string, current: number, total: number) => {
        if (toast) {
          toast.title = stage;
          if (total > 1) {
            toast.message = `Processing ${current} of ${total}`;
          } else {
            toast.message = "Please wait...";
          }
        }
      });

      // Show success message
      if (toast) {
        toast.style = Toast.Style.Success;
        toast.title = "Merge Complete!";

        const messages: string[] = [];
        messages.push(`${stats.filesMerged} files merged`);

        if (stats.duplicatesSkipped > 0) {
          messages.push(`${stats.duplicatesSkipped} duplicates skipped`);
        }

        if (stats.conflictsRenamed > 0) {
          messages.push(`${stats.conflictsRenamed} conflicts renamed`);
        }

        if (stats.errors.length > 0) {
          messages.push(`${stats.errors.length} errors occurred`);
        }

        toast.message = messages.join(", ");

        // Show detailed error toast if there were errors
        if (stats.errors.length > 0) {
          await showToast({
            style: Toast.Style.Failure,
            title: `${stats.errors.length} errors occurred`,
            message: stats.errors.slice(0, 3).join("; "),
          });
        }
      }

      // Close the command view after success
      await popToRoot();
    } catch (error) {
      // Show error message
      if (toast) {
        toast.style = Toast.Style.Failure;
        toast.title = "Merge Failed";
        toast.message = error instanceof Error ? error.message : String(error);
      } else {
        await showToast({
          style: Toast.Style.Failure,
          title: "Merge Failed",
          message: error instanceof Error ? error.message : String(error),
        });
      }

      console.error("Processing error:", error);
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <Form
      isLoading={isLoading}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Start Merging" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.Description text="Merge multiple ZIP files into one organized folder with automatic deduplication." />

      <Form.FilePicker
        id="inputDir"
        title="Input Folder"
        info="The folder containing your ZIP files"
        allowMultipleSelection={false}
        canChooseDirectories={true}
        canChooseFiles={false}
        defaultValue={defaultInputDir ? [defaultInputDir] : undefined}
        error={inputDirError}
        onChange={() => setInputDirError(undefined)}
      />

      <Form.FilePicker
        id="outputDir"
        title="Output Folder"
        info="Where to put the merged files"
        allowMultipleSelection={false}
        canChooseDirectories={true}
        canChooseFiles={false}
        defaultValue={defaultOutputDir ? [defaultOutputDir] : undefined}
        error={outputDirError}
        onChange={() => setOutputDirError(undefined)}
      />

      <Form.TextField
        id="outputFolderName"
        title="Output Folder Name"
        placeholder="MergedFiles"
        info="Name of the subfolder to create inside the output folder for merged contents. Leave empty to merge directly into output folder."
      />

      <Form.Separator />

      <Form.TextField
        id="filter"
        title="ZIP Name Filter"
        placeholder="takeout-"
        defaultValue="takeout-"
        info="Only ZIP files containing this text will be processed (case-insensitive). Leave as 'takeout-' for Google Takeout files, or change to match your ZIP files."
      />

      <Form.Checkbox
        id="deleteZips"
        label="Delete original ZIP files after successful merge"
        defaultValue={false}
        info="Warning: This permanently deletes the ZIP files. Make sure you have backups!"
      />

      <Form.Checkbox
        id="safeMode"
        label="Enable Safe Mode (Zip Bomb Protection)"
        defaultValue={true}
        info="Prevents processing of suspicious ZIP files (high compression ratio or excessive size)."
      />
    </Form>
  );
}
