// src/index.tsx
import {
  Form,
  ActionPanel,
  Action,
  showToast,
  Toast,
  showInFinder,
  Detail,
  Icon,
  getSelectedFinderItems,
  LaunchProps, // Keep LaunchProps
  Clipboard,
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
  currentStep: "selectDirectory" | "configureGeneration" | "showResults";
  finderSelectedPath: string | null; // Path initially detected from Finder, if any (deprecated, use finderSelectedPaths).
  finderSelectedPaths: string[]; // All paths initially detected from Finder, if any.
  pickerSelectedPaths: string[]; // Paths selected by the user via FilePicker.
  projectDirectory: string | null; // The confirmed project directory to process.
  finderSelectionInfo: FinderSelectionInfo | null; // Information about Finder selection for scope choice
  processOnlySelectedFiles: boolean; // Whether to process only selected files or entire directory
  selectedFilePaths: string[]; // Paths of files to process when processOnlySelectedFiles is true
  useDirectoryInsteadOfFiles: boolean; // If true, use directory even if files are selected
  outputFileName: string;
  maxFileSizeMbString: string;
  additionalIgnorePatterns: string;
  includeAiInstructions: boolean;
  outputToClipboard: boolean; // Whether to also copy output to clipboard
  progress: { message: string; details?: string } | null; // Progress message for long operations.
  estimatedStats: { size: number; tokens: number } | null; // Pre-calculated statistics for preview
  isCalculatingStats: boolean; // Whether statistics are being calculated in background
  generationResult: {
    filePath: string;
    fileName: string;
    tokens: number;
    size: number;
    copiedToClipboard: boolean;
  } | null; // Result of generation for results screen
  formErrors: Partial<
    Record<
      "projectDirectoryField" | "outputFileName" | "maxFileSizeMbString" | "additionalIgnorePatterns" | "general",
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

/**
 * Estimates the number of tokens in a text string using a simple heuristic.
 * Uses the approximation: 1 token ≈ 4 characters for English code.
 * @param content The text content to estimate tokens for.
 * @returns The estimated number of tokens.
 */
const estimateTokens = (content: string): number => {
  return Math.ceil(content.length / 4);
};

const INITIAL_STATE: AppState = {
  isLoading: false, // Don't start with loading state to prevent flicker
  currentStep: "selectDirectory",
  finderSelectedPath: null,
  finderSelectedPaths: [],
  pickerSelectedPaths: [],
  projectDirectory: null,
  finderSelectionInfo: null,
  processOnlySelectedFiles: false,
  selectedFilePaths: [],
  useDirectoryInsteadOfFiles: false,
  outputFileName: "project_code.txt",
  maxFileSizeMbString: (DEFAULT_MAX_FILE_SIZE_BYTES / 1024 / 1024).toString(),
  additionalIgnorePatterns: "",
  includeAiInstructions: true, // AI instructions are included by default.
  outputToClipboard: false, // Don't copy to clipboard by default
  progress: null,
  estimatedStats: null,
  isCalculatingStats: false,
  generationResult: null,
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
            // Save all selected paths from Finder
            const allSelectedPaths = finderItems.map((item) => item.path);
            // Verify the suggested directory is actually a directory
            const stats = await fs.stat(selectionInfo.suggestedDirectory);
            if (stats.isDirectory()) {
              setState((prev) => ({
                ...prev,
                finderSelectedPath: selectionInfo.suggestedDirectory, // Keep for backward compatibility
                finderSelectedPaths: allSelectedPaths, // Save all paths
                finderSelectionInfo: selectionInfo,
                pickerSelectedPaths: [], // Will be populated from finderSelectedPaths in filePickerValue
                formErrors: {},
              }));
              console.log("Analyzed Finder selection:", selectionInfo, "All paths:", allSelectedPaths);
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
   * Effect to pre-calculate statistics when entering configureGeneration step.
   * This runs in the background to estimate file size and token count.
   */
  useEffect(() => {
    async function calculatePreviewStats() {
      if (state.currentStep !== "configureGeneration" || !state.projectDirectory) {
        return;
      }

      if (state.isCalculatingStats || state.estimatedStats) {
        return; // Already calculating or already calculated
      }

      setState((prev) => ({ ...prev, isCalculatingStats: true }));

      try {
        // Create a temporary config for preview
        const previewConfig: FileProcessorConfig = {
          projectDirectory: state.projectDirectory,
          maxFileSizeBytes: parseFloat(state.maxFileSizeMbString || "1") * 1024 * 1024,
          includeAiInstructions: state.includeAiInstructions,
          processOnlySelectedFiles: state.processOnlySelectedFiles,
          selectedFilePaths: state.selectedFilePaths,
        };

        // Generate preview (this will process files but we only need the string length)
        const previewString = await generateProjectCodeString(previewConfig, (update) => {
          // Update progress silently
          console.log("Preview calculation:", update.message);
        });

        const estimatedTokens = estimateTokens(previewString);
        const estimatedSize = previewString.length;

        setState((prev) => ({
          ...prev,
          estimatedStats: { size: estimatedSize, tokens: estimatedTokens },
          isCalculatingStats: false,
        }));
      } catch (error) {
        console.error("Error calculating preview stats:", error);
        setState((prev) => ({ ...prev, isCalculatingStats: false }));
      }
    }

    calculatePreviewStats();
  }, [
    state.currentStep,
    state.projectDirectory,
    state.processOnlySelectedFiles,
    state.selectedFilePaths,
    state.includeAiInstructions,
    state.maxFileSizeMbString,
  ]);

  /**
   * Finds the common parent directory for an array of paths.
   * @param paths Array of file or directory paths.
   * @returns The common parent directory path.
   */
  const findCommonParent = useCallback((paths: string[]): string => {
    if (paths.length === 0) return "";
    if (paths.length === 1) {
      // For a single path, return its parent directory
      return path.dirname(paths[0]);
    }

    // Split all paths into segments
    const splitPaths = paths.map((p) => {
      const resolved = path.resolve(p);
      return resolved.split(path.sep).filter((segment) => segment !== "");
    });

    // Find the minimum length to avoid out-of-bounds
    const minLength = Math.min(...splitPaths.map((p) => p.length));
    if (minLength === 0) {
      // If any path is root, return root
      return path.parse(paths[0]).root || path.sep;
    }

    const commonSegments: string[] = [];

    // Compare segments from the beginning
    for (let i = 0; i < minLength; i++) {
      const segment = splitPaths[0][i];
      if (splitPaths.every((p) => p[i] === segment)) {
        commonSegments.push(segment);
      } else {
        break;
      }
    }

    // If no common segments found (different drives on Windows), return root of first path
    if (commonSegments.length === 0) {
      const root = path.parse(paths[0]).root;
      return root || path.sep;
    }

    // Reconstruct the path
    const root = path.parse(paths[0]).root;
    const result = root ? root + commonSegments.join(path.sep) : path.sep + commonSegments.join(path.sep);
    return result;
  }, []);

  /**
   * Validates the selected project directory and proceeds to the configuration step.
   * Called when the first form (directory selection) is submitted.
   * @param values The form values, containing the selected project directory.
   */
  const validateAndProceedToConfigure = useCallback(
    async (values: { projectDirectoryField: string[] }) => {
      setState((prev) => ({ ...prev, isLoading: true, formErrors: {} }));
      const selectedPaths = values.projectDirectoryField;

      if (!selectedPaths || selectedPaths.length === 0) {
        setState((prev) => ({
          ...prev,
          isLoading: false,
          formErrors: { ...prev.formErrors, projectDirectoryField: "Please select at least one file or directory." },
        }));
        await showToast({
          style: Toast.Style.Failure,
          title: "Input Error",
          message: "No files or directories selected.",
        });
        return;
      }

      try {
        // Check all paths exist and determine their types
        const pathStats = await Promise.all(
          selectedPaths.map(async (p) => {
            const stats = await fs.stat(p);
            return { path: p, isDirectory: stats.isDirectory(), isFile: stats.isFile() };
          }),
        );

        // Determine derived root and processing mode
        let derivedRoot: string;
        let isMultiSelection = false;

        if (selectedPaths.length === 1) {
          const singlePath = pathStats[0];
          if (singlePath.isDirectory) {
            derivedRoot = singlePath.path;
            // Single directory: process entire directory
            isMultiSelection = false;
          } else {
            // Single file: use parent directory as root, process only this file
            derivedRoot = path.dirname(singlePath.path);
            isMultiSelection = true;
          }
        } else {
          // Multiple paths: find common parent
          derivedRoot = findCommonParent(selectedPaths);
          isMultiSelection = true;
        }

        // Generate output filename based on root directory name
        const rootName = path.basename(derivedRoot) || "project";
        const dirName =
          selectedPaths.length === 1 && pathStats[0].isDirectory ? path.basename(selectedPaths[0]) : rootName;

        const nextStep = "configureGeneration";

        setState((prev) => ({
          ...prev,
          isLoading: false,
          projectDirectory: derivedRoot,
          selectedFilePaths: selectedPaths, // Store all selected paths
          processOnlySelectedFiles: isMultiSelection,
          outputFileName: sanitizeFileName(`${dirName}_project_code.txt`),
          currentStep: nextStep,
          estimatedStats: null, // Reset stats to trigger recalculation
          isCalculatingStats: false,
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
    },
    [findCommonParent],
  );

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

    // Determine output directory:
    // - If processing multiple selected items: save in the common parent (projectDirectory)
    // - If processing entire directory: save in parent directory (one level up)
    const outputDirectory = state.processOnlySelectedFiles
      ? state.projectDirectory // Common parent for multiple selections
      : path.dirname(state.projectDirectory); // Parent directory for single directory
    const outputFilePath = path.join(outputDirectory, finalOutputFileName);

    // Validate that selectedFilePaths is set when processOnlySelectedFiles is true
    if (state.processOnlySelectedFiles && (!state.selectedFilePaths || state.selectedFilePaths.length === 0)) {
      setState((prev) => ({
        ...prev,
        isLoading: false,
        formErrors: {
          ...prev.formErrors,
          general: "No files or directories selected for processing.",
        },
      }));
      await showToast({
        style: Toast.Style.Failure,
        title: "Configuration Error",
        message: "No files or directories selected for processing.",
      });
      return;
    }

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

      // Copy to clipboard if requested
      if (state.outputToClipboard) {
        await Clipboard.copy(projectCodeString);
      }

      // Calculate estimated tokens for UI display
      const estimatedTokens = estimateTokens(projectCodeString);
      const fileSize = projectCodeString.length;

      // Save generation result and move to results screen
      setState((prev) => ({
        ...prev,
        isLoading: false,
        progress: null,
        generationResult: {
          filePath: outputFilePath,
          fileName: finalOutputFileName,
          tokens: estimatedTokens,
          size: fileSize,
          copiedToClipboard: state.outputToClipboard,
        },
        currentStep: "showResults",
      }));

      toast.style = Toast.Style.Success;
      toast.title = "Success!";
      toast.message = `File "${finalOutputFileName}" generated (~${estimatedTokens.toLocaleString()} tokens)`;
    } catch (e) {
      // Removed ':any'
      const typedError = e as Error;
      const errorMessage = typedError.message || "Unknown generation error";
      const fullErrorMessage = `Generation failed: ${errorMessage}`;
      console.error("Generation Error:", e);
      console.error("Error details:", {
        projectDirectory: state.projectDirectory,
        processOnlySelectedFiles: state.processOnlySelectedFiles,
        selectedFilePaths: state.selectedFilePaths,
        selectedFilePathsLength: state.selectedFilePaths?.length,
      });
      setState((prev) => ({
        ...prev,
        isLoading: false,
        progress: null,
        formErrors: { ...prev.formErrors, general: fullErrorMessage },
      }));
      if (toast) {
        toast.style = Toast.Style.Failure;
        toast.title = "Generation Failed";
        toast.message = errorMessage.substring(0, 150) + (errorMessage.length > 150 ? "..." : "");
      }
      // Show additional error toast for visibility
      await showToast({
        style: Toast.Style.Failure,
        title: "Generation Failed",
        message: errorMessage.substring(0, 100) + (errorMessage.length > 100 ? "..." : ""),
      });
    } finally {
      // Only set loading to false if not already set in catch block
      setState((prev) => {
        if (prev.isLoading) {
          return { ...prev, isLoading: false, progress: null };
        }
        return prev;
      });
    }
  }, [
    state.projectDirectory,
    state.outputFileName,
    state.maxFileSizeMbString,
    state.includeAiInstructions,
    state.outputToClipboard,
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
    // Use pickerSelectedPaths if user has made changes, otherwise use finderSelectedPaths
    const filePickerValue =
      state.pickerSelectedPaths.length > 0
        ? state.pickerSelectedPaths
        : state.finderSelectedPaths.length > 0
          ? state.finderSelectedPaths
          : state.finderSelectedPath
            ? [state.finderSelectedPath] // Fallback for backward compatibility
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
        <Form.Description text="Select one or multiple files and directories for code generation." />

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
          title="Files or Directories"
          info="Select one or multiple files and directories. Directories will be processed recursively."
          allowMultipleSelection={true}
          canChooseDirectories={true}
          canChooseFiles={true}
          value={filePickerValue} // Controlled component based on derived state.
          error={state.formErrors.projectDirectoryField}
          onChange={(newValue) => {
            setState((prev) => ({
              ...prev,
              pickerSelectedPaths: newValue || [], // Update picker paths on user interaction.
              // Clear finder selection when user manually changes selection
              finderSelectedPaths: newValue && newValue.length > 0 ? [] : prev.finderSelectedPaths,
              finderSelectedPath: newValue && newValue.length > 0 ? null : prev.finderSelectedPath,
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
                  finderSelectedPaths: [],
                  pickerSelectedPaths: [],
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
          <Form.Description text={`Processing Mode: Selected files only (${state.selectedFilePaths.length} items)`} />
        )}
        {!state.processOnlySelectedFiles && <Form.Description text="Processing Mode: Entire directory" />}
        {state.isCalculatingStats && <Form.Description text="Calculating preview statistics..." />}
        {state.estimatedStats && !state.isCalculatingStats && (
          <>
            <Form.Description text={`Estimated size: ${(state.estimatedStats.size / 1024 / 1024).toFixed(2)} MB`} />
            <Form.Description text={`Estimated tokens: ~${state.estimatedStats.tokens.toLocaleString()}`} />
          </>
        )}
        <Form.Separator />
        <Form.TextField
          id="outputFileName"
          title="Output File Name"
          info={`File will be saved next to the selected project directory. Valid chars: a-z, A-Z, 0-9, '.', '_', '-'`}
          value={state.outputFileName}
          error={state.formErrors.outputFileName}
          onChange={(newValue) => {
            setState((prev) => ({ ...prev, outputFileName: newValue, estimatedStats: null }));
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
            setState((prev) => ({ ...prev, maxFileSizeMbString: newValue, estimatedStats: null }));
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
          onChange={(newValue) =>
            setState((prev) => ({ ...prev, includeAiInstructions: newValue, estimatedStats: null }))
          }
          info="Includes special <ai_instruction> and <ai_analysis_guide> tags in the output, which can help AI models better process the code."
        />
        <Form.Checkbox
          id="outputToClipboard"
          label="Also copy to clipboard"
          value={state.outputToClipboard}
          onChange={(newValue) => setState((prev) => ({ ...prev, outputToClipboard: newValue }))}
          info="Copy the generated content to clipboard in addition to saving the file"
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

  // Render results screen after successful generation
  if (state.currentStep === "showResults" && state.generationResult) {
    const result = state.generationResult;
    const sizeMB = (result.size / 1024 / 1024).toFixed(2);
    const sizeKB = (result.size / 1024).toFixed(2);

    const markdown = `# Generation Complete! ✅

## File Information

**File Name:** \`${result.fileName}\`

**Location:** \`${result.filePath}\`

**Size:** ${sizeMB} MB (${sizeKB} KB)

**Estimated Tokens:** ~${result.tokens.toLocaleString()}

**Copied to Clipboard:** ${result.copiedToClipboard ? "Yes ✅" : "No"}

---

## Actions

Use the actions below to open the file or copy its path.`;

    return (
      <Detail
        markdown={markdown}
        actions={
          <ActionPanel>
            <Action title="Show in Finder" icon={Icon.Finder} onAction={() => showInFinder(result.filePath)} />
            <Action
              title="Copy Path to Clipboard"
              icon={Icon.Clipboard}
              onAction={async () => {
                await Clipboard.copy(result.filePath);
                await showToast(Toast.Style.Success, "Path Copied!");
              }}
            />
            <Action
              title="Generate Another"
              icon={Icon.ArrowLeft}
              onAction={() => {
                setState((prev) => ({
                  ...prev,
                  currentStep: "selectDirectory",
                  projectDirectory: null,
                  finderSelectionInfo: null,
                  finderSelectedPaths: [],
                  pickerSelectedPaths: [],
                  selectedFilePaths: [],
                  processOnlySelectedFiles: false,
                  generationResult: null,
                  estimatedStats: null,
                  formErrors: {},
                }));
              }}
            />
          </ActionPanel>
        }
      />
    );
  }

  // Fallback loading view if no other state matches (should be rare).
  return <Detail isLoading={true} markdown="## Loading Extension..." />;
}
