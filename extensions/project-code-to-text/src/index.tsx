// src/index.tsx
import {
  Form,
  ActionPanel,
  Action,
  showToast,
  Toast,
  popToRoot,
  showInFinder,
  Detail,
  Icon,
  getSelectedFinderItems,
  LaunchProps, // Keep LaunchProps
} from "@raycast/api";
import { useState, useEffect, useCallback } from "react";
import path from "path";
import fs from "fs/promises";
import { generateProjectCodeString } from "./fileProcessor";
import { DEFAULT_MAX_FILE_SIZE_BYTES, MIN_MAX_FILE_SIZE_MB, MAX_MAX_FILE_SIZE_MB } from "./constants";
// GenerationConfig is not directly used in this file, FileProcessorConfig is.
// If GenerationConfig is only defined in types.ts and used by FileProcessorConfig,
// then it's fine. If it was meant to be used here, we need to ensure it is.
// For now, assuming FileProcessorConfig is sufficient for this file.
import type { FileProcessorConfig } from "./types";

/**
 * Props passed by Raycast when the command is launched.
 * Currently not using any specific launch context properties here directly,
 * but good to have for potential future use.
 */
// eslint-disable-next-line @typescript-eslint/no-empty-object-type
interface CommandLaunchProps extends LaunchProps {} // Corrected: no-empty-object-type if LaunchProps is already an empty object, or add a comment if it's intentional.
// If LaunchProps itself can be empty, this is fine. Raycast's LaunchProps is not empty.

/**
 * Represents the overall state of the command's UI and logic.
 */
interface AppState {
  isLoading: boolean;
  currentStep: "selectDirectory" | "configureGeneration";
  finderSelectedPath: string | null; // Path initially detected from Finder, if any.
  pickerSelectedPath: string | null; // Path selected by the user via FilePicker.
  projectDirectory: string | null; // The confirmed project directory to process.
  outputFileName: string;
  maxFileSizeMbString: string;
  includeAiInstructions: boolean;
  progress: { message: string; details?: string } | null; // Progress message for long operations.
  formErrors: Partial<Record<"projectDirectoryField" | "outputFileName" | "maxFileSizeMbString" | "general", string>>;
}

/**
 * Sanitizes a string to be a valid filename by removing/replacing illegal characters.
 * @param name The input string to sanitize.
 * @returns A sanitized string suitable for use as a filename.
 */
const sanitizeFileName = (name: string): string => {
  // Remove leading/trailing whitespace, replace multiple whitespace with underscore, remove illegal chars.
  return name
    .trim()
    .replace(/\s+/g, "_")
    .replace(/[<>:"\/\\|?*]/g, "_") // Исправлено: заменено на .replace(/[<>:"\\/?*|]/g, "_")
    .replace(/[^a-zA-Z0-9._-]/g, "");
};

const INITIAL_STATE: AppState = {
  isLoading: true, // Start loading to check Finder selection.
  currentStep: "selectDirectory",
  finderSelectedPath: null,
  pickerSelectedPath: null,
  projectDirectory: null,
  outputFileName: "project_code.txt",
  maxFileSizeMbString: (DEFAULT_MAX_FILE_SIZE_BYTES / 1024 / 1024).toString(),
  includeAiInstructions: true, // AI instructions are included by default.
  progress: null,
  formErrors: {},
};

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export default function GenerateProjectCodeCommand(_props: CommandLaunchProps) {
  // Changed props to _props
  const [state, setState] = useState<AppState>(INITIAL_STATE);

  /**
   * Effect to check for an active Finder selection when the command launches.
   * This runs once on component mount.
   */
  useEffect(() => {
    async function initializeFinderPath() {
      setState((prev) => ({ ...prev, isLoading: true, formErrors: {} }));
      try {
        const finderItems = await getSelectedFinderItems();
        if (finderItems.length > 0) {
          const firstItemPath = finderItems[0].path;
          const stats = await fs.stat(firstItemPath); // Verify the path and get its type.
          if (stats.isDirectory()) {
            setState((prev) => ({
              ...prev,
              finderSelectedPath: firstItemPath,
              pickerSelectedPath: null,
              isLoading: false,
            }));
            console.log("Initial Finder selection (directory):", firstItemPath);
            return; // Successfully found and set Finder path.
          } else {
            console.log("Initial Finder selection (not a directory):", firstItemPath);
          }
        } else {
          console.log("No initial Finder selection (empty array returned).");
        }
      } catch (error) {
        // Removed ': any' and will cast error.message below
        const typedError = error as Error; // Type assertion
        if (typedError.message?.includes("Finder isn't the frontmost application")) {
          console.log("Finder not frontmost or no selection, proceeding to manual selection.");
        } else {
          console.error("Error during initial Finder path retrieval:", typedError.message || error);
        }
      }
      setState((prev) => ({ ...prev, finderSelectedPath: null, pickerSelectedPath: null, isLoading: false }));
    }
    initializeFinderPath();
  }, []); // Empty dependency array ensures this runs only once on mount.

  /**
   * Validates the selected project directory and proceeds to the configuration step.
   * Called when the first form (directory selection) is submitted.
   * @param values The form values, containing the selected project directory.
   */
  const validateAndProceedToConfigure = useCallback(async (values: { projectDirectoryField: string[] }) => {
    setState((prev) => ({ ...prev, isLoading: true, formErrors: {} }));
    const dirPathArray = values.projectDirectoryField;

    if (!dirPathArray || dirPathArray.length === 0 || !dirPathArray[0]) {
      setState((prev) => ({
        ...prev,
        isLoading: false,
        formErrors: { ...prev.formErrors, projectDirectoryField: "Please select a project directory." },
      }));
      await showToast({ style: Toast.Style.Failure, title: "Input Error", message: "No directory selected." });
      return;
    }
    const dirPath = dirPathArray[0];

    try {
      const stats = await fs.stat(dirPath);
      if (!stats.isDirectory()) {
        setState((prev) => ({
          ...prev,
          isLoading: false,
          formErrors: { ...prev.formErrors, projectDirectoryField: "The selected path is not a directory." },
        }));
        await showToast({
          style: Toast.Style.Failure,
          title: "Invalid Path",
          message: "Please select a valid directory.",
        });
        return;
      }

      const dirName = path.basename(dirPath);
      setState((prev) => ({
        ...prev,
        isLoading: false,
        projectDirectory: dirPath,
        outputFileName: sanitizeFileName(`${dirName}_project_code.txt`),
        currentStep: "configureGeneration",
        formErrors: {},
      }));
    } catch (e) {
      const typedError = e as Error;
      const errorMessage = typedError.message?.substring(0, 100) || "Unknown error";
      setState((prev) => ({
        ...prev,
        isLoading: false,
        formErrors: { ...prev.formErrors, projectDirectoryField: `Could not access path: ${errorMessage}` },
      }));
      await showToast({
        style: Toast.Style.Failure,
        title: "Access Error",
        message: `Could not access path: ${errorMessage}`,
      });
    }
  }, []);

  /**
   * Validates the output configuration form (filename, max file size).
   * @returns True if the form is valid, false otherwise.
   */
  const validateConfigurationForm = (): boolean => {
    const errors: Partial<Record<"outputFileName" | "maxFileSizeMbString", string>> = {};
    const { outputFileName: currentOutputFileName, maxFileSizeMbString: currentMaxFileSizeMbString } = state;

    if (!currentOutputFileName.trim()) {
      errors.outputFileName = "Output file name cannot be empty.";
    } else {
      const sanitized = sanitizeFileName(currentOutputFileName.trim());
      if (sanitized !== currentOutputFileName.trim() || !sanitized) {
        errors.outputFileName = "Filename contains invalid characters or is empty after sanitization.";
      } else if (sanitized.startsWith(".") || sanitized.endsWith(".")) {
        errors.outputFileName = "Filename cannot start or end with a dot.";
      }
    }

    const fileSizeNum = parseFloat(currentMaxFileSizeMbString);
    if (isNaN(fileSizeNum)) {
      errors.maxFileSizeMbString = "Max file size must be a number.";
    } else if (fileSizeNum < MIN_MAX_FILE_SIZE_MB || fileSizeNum > MAX_MAX_FILE_SIZE_MB) {
      errors.maxFileSizeMbString = `Max file size must be between ${MIN_MAX_FILE_SIZE_MB} and ${MAX_MAX_FILE_SIZE_MB} MB.`;
    }

    setState((prev) => ({ ...prev, formErrors: { ...prev.formErrors, ...errors } }));
    return Object.keys(errors).length === 0;
  };

  /**
   * Handles the final submission to generate the project code file.
   */
  const handleSubmitGeneration = useCallback(async () => {
    setState((prev) => ({ ...prev, formErrors: { ...prev.formErrors, general: undefined } }));

    if (!validateConfigurationForm() || !state.projectDirectory) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Validation Error",
        message: "Please correct the form errors or select a project directory.",
      });
      return;
    }

    setState((prev) => ({ ...prev, isLoading: true, progress: { message: "Initializing generation..." } }));
    const toast = await showToast({ style: Toast.Style.Animated, title: "Processing...", message: "Starting..." });

    const finalOutputFileName = sanitizeFileName(state.outputFileName.trim());
    if (!finalOutputFileName) {
      setState((prev) => ({
        ...prev,
        isLoading: false,
        formErrors: { ...prev.formErrors, outputFileName: "Output file name is invalid." },
      }));
      await showToast({
        style: Toast.Style.Failure,
        title: "Validation Error",
        message: "Output file name is invalid after sanitization.",
      });
      return;
    }

    // Ensure projectDirectory is not null before using it with path.dirname
    if (!state.projectDirectory) {
      // This case should ideally be caught by the validation above, but defensive check is good.
      setState((prev) => ({
        ...prev,
        isLoading: false,
        formErrors: { ...prev.formErrors, general: "Project directory is not set." },
      }));
      await showToast({
        style: Toast.Style.Failure,
        title: "Internal Error",
        message: "Project directory is not set.",
      });
      return;
    }
    const parentDirectory = path.dirname(state.projectDirectory);
    const outputFilePath = path.join(parentDirectory, finalOutputFileName);

    const processorConfig: FileProcessorConfig = {
      projectDirectory: state.projectDirectory,
      maxFileSizeBytes: parseFloat(state.maxFileSizeMbString) * 1024 * 1024,
      includeAiInstructions: state.includeAiInstructions,
    };

    try {
      const projectCodeString = await generateProjectCodeString(processorConfig, (update) => {
        setState((prev) => ({ ...prev, progress: update }));
        if (toast) {
          toast.message = `${update.message}${update.details ? `: ${update.details.substring(0, 50)}...` : ""}`;
        }
      });

      await fs.writeFile(outputFilePath, projectCodeString, "utf-8");

      toast.style = Toast.Style.Success;
      toast.title = "Success!";
      toast.message = `File "${finalOutputFileName}" generated in ${parentDirectory}.`;
      toast.primaryAction = {
        title: "Show in Finder",
        shortcut: { modifiers: ["cmd", "shift"], key: "f" },
        onAction: () => showInFinder(outputFilePath),
      };
      toast.secondaryAction = {
        title: "Copy Path to Clipboard",
        shortcut: { modifiers: ["cmd", "shift"], key: "c" },
        onAction: async () => {
          const copyAction = new Action.CopyToClipboard({ content: outputFilePath });
          await copyAction.perform();
          await showToast(Toast.Style.Success, "Path Copied!");
        },
      };
      popToRoot({ clearSearchBar: true });
    } catch (e) {
      // Removed ':any'
      const typedError = e as Error;
      const errorMessage = typedError.message?.substring(0, 150) || "Unknown generation error";
      console.error("Generation Error:", e);
      setState((prev) => ({
        ...prev,
        formErrors: { ...prev.formErrors, general: `Generation failed: ${errorMessage}` },
      }));
      if (toast) {
        toast.style = Toast.Style.Failure;
        toast.title = "Generation Failed";
        toast.message = errorMessage.substring(0, 100) + (errorMessage.length > 100 ? "..." : "");
      }
    } finally {
      setState((prev) => ({ ...prev, isLoading: false, progress: null }));
    }
  }, [state.projectDirectory, state.outputFileName, state.maxFileSizeMbString, state.includeAiInstructions]);

  // Render loading state while checking Finder selection or during generation.
  if (state.isLoading && !state.progress && state.currentStep === "selectDirectory") {
    return <Detail isLoading={true} markdown="## Checking Finder Selection..." />;
  }
  if (state.isLoading && state.progress) {
    const { message, details } = state.progress;
    return (
      <Detail
        isLoading={true}
        markdown={`## Generating Project Code...\n\n**${message}**\n\n${details ? `\`${details}\`` : ""}`}
      />
    );
  }

  // Render directory selection form if no directory is confirmed yet.
  if (state.currentStep === "selectDirectory") {
    const filePickerValue = state.pickerSelectedPath
      ? [state.pickerSelectedPath]
      : state.finderSelectedPath
        ? [state.finderSelectedPath]
        : [];
    return (
      <Form
        isLoading={state.isLoading} //isLoading for the form submission action.
        actions={
          <ActionPanel>
            <Action.SubmitForm
              title="Next: Configure Output"
              icon={Icon.ArrowRight}
              onSubmit={validateAndProceedToConfigure}
            />
          </ActionPanel>
        }
      >
        <Form.Description text="Select the project directory for code generation." />
        <Form.FilePicker
          id="projectDirectoryField" // This ID connects the field to the form submission values.
          title="Project Directory"
          info="Choose the root directory of the project."
          allowMultipleSelection={false}
          canChooseDirectories
          canChooseFiles={false}
          value={filePickerValue} // Controlled component based on derived state.
          error={state.formErrors.projectDirectoryField}
          onChange={(newValue) => {
            const newPath = newValue.length > 0 ? newValue[0] : null;
            setState((prev) => ({
              ...prev,
              pickerSelectedPath: newPath, // Update picker path on user interaction.
              formErrors: { ...prev.formErrors, projectDirectoryField: undefined }, // Clear error on change.
            }));
          }}
        />
        {state.formErrors.general && (
          <>
            <Form.Separator />
            <Form.Description title="Error" text={state.formErrors.general} />
          </>
        )}
      </Form>
    );
  }

  // Render output configuration form if a project directory has been confirmed.
  if (state.currentStep === "configureGeneration" && state.projectDirectory) {
    return (
      <Form
        isLoading={state.isLoading} // isLoading for the form submission action.
        actions={
          <ActionPanel>
            <Action.SubmitForm title="Generate File" icon={Icon.Wand} onSubmit={handleSubmitGeneration} />
            <Action
              title="Back to Directory Selection"
              icon={Icon.ArrowLeft}
              onAction={() => {
                setState((prev) => ({
                  ...prev,
                  currentStep: "selectDirectory",
                  projectDirectory: null,
                  pickerSelectedPath: null, // Clear picker path when going back.
                  formErrors: {}, // Clear all errors.
                }));
              }}
              shortcut={{ modifiers: ["cmd"], key: "b" }}
            />
          </ActionPanel>
        }
      >
        <Form.Description text={`Selected Project: ${state.projectDirectory}`} />
        <Form.Separator />
        <Form.TextField
          id="outputFileName"
          title="Output File Name"
          info={`File will be saved next to the selected project directory. Valid chars: a-z, A-Z, 0-9, '.', '_', '-'`}
          value={state.outputFileName}
          error={state.formErrors.outputFileName}
          onChange={(newValue) => {
            setState((prev) => ({ ...prev, outputFileName: newValue }));
            if (state.formErrors.outputFileName)
              setState((prev) => ({ ...prev, formErrors: { ...prev.formErrors, outputFileName: undefined } }));
          }}
        />
        <Form.TextField
          id="maxFileSizeMbString"
          title="Max File Size for Content (MB)"
          placeholder={`e.g., ${DEFAULT_MAX_FILE_SIZE_BYTES / 1024 / 1024}`}
          info={`Files larger than this will have content omitted. Min: ${MIN_MAX_FILE_SIZE_MB}, Max: ${MAX_MAX_FILE_SIZE_MB} MB.`}
          value={state.maxFileSizeMbString}
          error={state.formErrors.maxFileSizeMbString}
          onChange={(newValue) => {
            setState((prev) => ({ ...prev, maxFileSizeMbString: newValue }));
            if (state.formErrors.maxFileSizeMbString)
              setState((prev) => ({ ...prev, formErrors: { ...prev.formErrors, maxFileSizeMbString: undefined } }));
          }}
        />
        <Form.Checkbox
          id="includeAiInstructions"
          label="Include AI Instructions"
          value={state.includeAiInstructions}
          onChange={(newValue) => setState((prev) => ({ ...prev, includeAiInstructions: newValue }))}
          info="Includes special <ai_instruction> and <ai_analysis_guide> tags in the output, which can help AI models better process the code."
        />
        {state.formErrors.general && (
          <>
            <Form.Separator />
            <Form.Description title="Error" text={state.formErrors.general} />
          </>
        )}
      </Form>
    );
  }

  // Fallback loading view if no other state matches (should be rare).
  return <Detail isLoading={true} markdown="## Loading Extension..." />;
}
