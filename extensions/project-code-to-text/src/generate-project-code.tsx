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
import type { FileProcessorConfig, FinderSelectionInfo } from "./types";

/**
 * Props passed by Raycast when the command is launched.
 * Currently not using any specific launch context properties here directly,
 * but good to have for potential future use.
 */
type CommandLaunchProps = LaunchProps;

/**
 * Represents the overall state of the command's UI and logic.
 */
interface AppState {
  isLoading: boolean;
  currentStep: "selectDirectory" | "configureGeneration";
  finderSelectedPath: string | null; // Path initially detected from Finder, if any.
  pickerSelectedPath: string | null; // Path selected by the user via FilePicker.
  projectDirectory: string | null; // The confirmed project directory to process.
  finderSelectionInfo: FinderSelectionInfo | null; // Information about Finder selection for scope choice
  processOnlySelectedFiles: boolean; // Whether to process only selected files or entire directory
  selectedFilePaths: string[]; // Paths of files to process when processOnlySelectedFiles is true
  useDirectoryInsteadOfFiles: boolean; // If true, use directory even if files are selected
  outputFileName: string;
  maxFileSizeMbString: string;
  additionalIgnorePatterns: string;
  includeAiInstructions: boolean;
  progress: { message: string; details?: string } | null; // Progress message for long operations.
  formErrors: Partial<
    Record<
      "projectDirectoryField" | "outputFileName" | "maxFileSizeMbString" | "general" | "additionalIgnorePatterns",
      string
    >
  >;
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
    .replace(/[<>:"\\/?*|]/g, "_")
    .replace(/[^a-zA-Z0-9._-]/g, "");
};

const INITIAL_STATE: AppState = {
  isLoading: false, // Don't start with loading state to prevent flicker
  currentStep: "selectDirectory",
  finderSelectedPath: null,
  pickerSelectedPath: null,
  projectDirectory: null,
  finderSelectionInfo: null,
  processOnlySelectedFiles: false,
  selectedFilePaths: [],
  useDirectoryInsteadOfFiles: false,
  outputFileName: "project_code.txt",
  maxFileSizeMbString: (DEFAULT_MAX_FILE_SIZE_BYTES / 1024 / 1024).toString(),
  additionalIgnorePatterns: "",
  includeAiInstructions: true, // AI instructions are included by default.
  progress: null,
  formErrors: {},
};

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export default function GenerateProjectCodeCommand(_props: CommandLaunchProps) {
  // Changed props to _props
  const [state, setState] = useState<AppState>(INITIAL_STATE);

  /**
   * Analyzes Finder selection and returns information for UI decision making.
   * Determines available options and suggested paths.
   */
  const analyzeFinderSelection = async (finderItems: Array<{ path: string }>): Promise<FinderSelectionInfo | null> => {
    if (finderItems.length === 0) return null;

    const paths = finderItems.map((item) => item.path);
    const pathStats = await Promise.all(
      paths.map(async (p) => {
        try {
          const stats = await fs.stat(p);
          return { path: p, isDirectory: stats.isDirectory() };
        } catch {
          return { path: p, isDirectory: false };
        }
      }),
    );

    const directories = pathStats.filter((item) => item.isDirectory);
    const files = pathStats.filter((item) => !item.isDirectory);

    let suggestedDirectory: string;
    let directoryName: string | undefined;

    if (directories.length > 0) {
      // If we have directories, use the first one
      suggestedDirectory = directories[0].path;
      directoryName = path.basename(suggestedDirectory);
    } else if (files.length > 0) {
      // Find common parent directory for files
      if (files.length === 1) {
        suggestedDirectory = path.dirname(files[0].path);
      } else {
        // Find common parent directory for multiple files
        const parentDirs = files.map((f) => path.dirname(f.path));
        let commonParent = parentDirs[0];

        for (let i = 1; i < parentDirs.length; i++) {
          // Split paths into segments for proper comparison
          const currentSegments = parentDirs[i].split(path.sep);
          const commonSegments = commonParent.split(path.sep);

          const minSegments = Math.min(currentSegments.length, commonSegments.length);
          const sharedSegments: string[] = [];

          for (let j = 0; j < minSegments; j++) {
            if (currentSegments[j] === commonSegments[j]) {
              sharedSegments.push(currentSegments[j]);
            } else {
              break;
            }
          }

          commonParent = sharedSegments.join(path.sep);
        }

        suggestedDirectory = commonParent || path.dirname(files[0].path);
      }
    } else {
      return null;
    }

    return {
      hasFiles: files.length > 0,
      hasDirectories: directories.length > 0,
      selectedFiles: files.map((f) => f.path),
      suggestedDirectory,
      fileNames: files.map((f) => path.basename(f.path)),
      directoryName,
    };
  };

  /**
   * Effect to check for an active Finder selection when the command launches.
   * This runs once on component mount.
   */
  useEffect(() => {
    async function initializeFinderPath() {
      // Don't show loading state immediately to prevent flicker
      try {
        const finderItems = await getSelectedFinderItems();
        if (finderItems.length > 0) {
          console.log(
            `Found ${finderItems.length} Finder selection(s):`,
            finderItems.map((i) => i.path),
          );

          const selectionInfo = await analyzeFinderSelection(finderItems);
          if (selectionInfo) {
            // Verify the suggested directory is actually a directory
            const stats = await fs.stat(selectionInfo.suggestedDirectory);
            if (stats.isDirectory()) {
              setState((prev) => ({
                ...prev,
                finderSelectedPath: selectionInfo.suggestedDirectory,
                finderSelectionInfo: selectionInfo,
                pickerSelectedPath: null,
                formErrors: {},
              }));
              console.log("Analyzed Finder selection:", selectionInfo);
              // Update processing mode after state is set
              setTimeout(() => updateProcessingMode(), 0);
              return; // Successfully found and set Finder path.
            }
          }

          console.log("Could not determine suitable directory from Finder selection");
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
      // No need to explicitly set isLoading to false since we never set it to true
      setState((prev) => ({ ...prev, finderSelectedPath: prev.finderSelectedPath, formErrors: {} }));
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

      // Always go to configuration step now
      const nextStep = "configureGeneration";

      setState((prev) => ({
        ...prev,
        isLoading: false,
        projectDirectory: dirPath,
        outputFileName: sanitizeFileName(`${dirName}_project_code.txt`),
        currentStep: nextStep,
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
   * Updates the processing mode based on user selection.
   */
  const updateProcessingMode = useCallback(() => {
    setState((prev) => {
      const shouldUseFiles = Boolean(prev.finderSelectionInfo?.hasFiles && !prev.useDirectoryInsteadOfFiles);
      return {
        ...prev,
        processOnlySelectedFiles: shouldUseFiles,
        selectedFilePaths: shouldUseFiles ? prev.finderSelectionInfo?.selectedFiles || [] : [],
      };
    });
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
      additionalIgnorePatterns: state.additionalIgnorePatterns,
      includeAiInstructions: state.includeAiInstructions,
      processOnlySelectedFiles: state.processOnlySelectedFiles,
      selectedFilePaths: state.selectedFilePaths,
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
          await Action.CopyToClipboard({ content: outputFilePath });
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
  }, [
    state.projectDirectory,
    state.outputFileName,
    state.maxFileSizeMbString,
    state.additionalIgnorePatterns,
    state.includeAiInstructions,
  ]);

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

        {/* Show selected files if any */}
        {state.finderSelectionInfo?.hasFiles && state.finderSelectionInfo.fileNames.length > 0 && (
          <>
            <Form.Description
              title="Selected Files"
              text={`Found ${state.finderSelectionInfo.fileNames.length} selected file${state.finderSelectionInfo.fileNames.length === 1 ? "" : "s"}:`}
            />
            <Form.TagPicker
              id="selectedFiles"
              title="Files to Process"
              value={
                state.useDirectoryInsteadOfFiles
                  ? [state.finderSelectionInfo.suggestedDirectory]
                  : state.finderSelectionInfo.selectedFiles
              }
              onChange={(newFiles) => {
                if (state.useDirectoryInsteadOfFiles) {
                  // Don't allow changing the directory selection when in directory mode
                  return;
                }
                setState((prev) => {
                  const updatedSelectionInfo = prev.finderSelectionInfo
                    ? {
                        ...prev.finderSelectionInfo,
                        selectedFiles: newFiles,
                      }
                    : null;
                  return {
                    ...prev,
                    finderSelectionInfo: updatedSelectionInfo,
                    selectedFilePaths: newFiles,
                  };
                });
                updateProcessingMode();
              }}
            >
              {state.useDirectoryInsteadOfFiles ? (
                <Form.TagPicker.Item
                  key={state.finderSelectionInfo.suggestedDirectory}
                  value={state.finderSelectionInfo.suggestedDirectory}
                  title={`📁 ${path.basename(state.finderSelectionInfo.suggestedDirectory)}`}
                />
              ) : (
                state.finderSelectionInfo.selectedFiles.map((filePath, index) => (
                  <Form.TagPicker.Item
                    key={filePath}
                    value={filePath}
                    title={state.finderSelectionInfo?.fileNames[index] || path.basename(filePath)}
                  />
                ))
              )}
            </Form.TagPicker>

            <Form.Checkbox
              id="useDirectoryInsteadOfFiles"
              label={`Process entire directory instead (${path.basename(state.finderSelectionInfo.suggestedDirectory)})`}
              value={state.useDirectoryInsteadOfFiles}
              onChange={(newValue) => {
                setState((prev) => ({ ...prev, useDirectoryInsteadOfFiles: newValue }));
                updateProcessingMode();
              }}
              info="Check this to process the entire parent directory instead of just the selected files"
            />
            <Form.Separator />
          </>
        )}

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
                  finderSelectionInfo: null,
                  pickerSelectedPath: null,
                  formErrors: {},
                }));
              }}
              shortcut={{ modifiers: ["cmd"], key: "b" }}
            />
          </ActionPanel>
        }
      >
        <Form.Description text={`Selected Project: ${state.projectDirectory}`} />
        {state.processOnlySelectedFiles && (
          <Form.Description text={`Processing Mode: Selected files only (${state.selectedFilePaths.length} files)`} />
        )}
        {!state.processOnlySelectedFiles && <Form.Description text="Processing Mode: Entire directory" />}
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
        <Form.TextField
          id="additionalIgnorePatterns"
          title="Additional Ignore Patterns"
          placeholder="e.g., dist/, package-lock.json, coverage/, .gitignore"
          info={`Specify additional ignore patterns separated by commas. (.gitignore rules and common folders like node_modules/, .git/, build/, and IDE files are already excluded.)`}
          value={state.additionalIgnorePatterns}
          error={state.formErrors.additionalIgnorePatterns}
          onChange={(newValue) => {
            setState((prev) => ({
              ...prev,
              additionalIgnorePatterns: newValue,
            }));
            if (state.formErrors.additionalIgnorePatterns) {
              setState((prev) => ({
                ...prev,
                formErrors: { ...prev.formErrors, additionalIgnorePatterns: undefined },
              }));
            }
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
