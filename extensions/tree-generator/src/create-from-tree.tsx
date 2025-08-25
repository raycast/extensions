import { useState, useEffect } from "react";
import { homedir } from "os";
import { join } from "path";
import { showToast, Toast } from "@raycast/api";
import { TreeCreationOptions, TreeCreationResult } from "./types";
import { TreeParser, TreeCreator, DirectoryUtils } from "./utils";
import { TreeCreationForm, TreeCreationResultView } from "./components";
import { showFailureToast } from "@raycast/utils";

type ViewState = "form" | "result";

/**
 * Main command component for creating files from directory trees
 */
export default function CreateFromTreeCommand() {
  const [viewState, setViewState] = useState<ViewState>("form");
  const [result, setResult] = useState<TreeCreationResult | null>(null);

  // Initialize with current directory as default
  const getInitialOptions = (): TreeCreationOptions => {
    return {
      rootPath: "",
      overwriteExisting: false,
      directoriesOnly: false,
    };
  };

  const [currentOptions, setCurrentOptions] = useState<TreeCreationOptions>(getInitialOptions());

  // Initialize with current directory
  useEffect(() => {
    const initializeDirectory = async () => {
      try {
        const currentDir = await DirectoryUtils.getCurrentDirectorySilent();
        setCurrentOptions((prev) => ({
          ...prev,
          rootPath: currentDir,
        }));
      } catch {
        // Fallback to home directory
        setCurrentOptions((prev) => ({
          ...prev,
          rootPath: homedir(),
        }));
      }
    };

    initializeDirectory();
  }, []);

  const handleCreateFromTree = async (options: TreeCreationOptions, treeString: string) => {
    try {
      // Parse the tree string
      const nodes = TreeParser.parseTreeString(treeString);

      if (nodes.length === 0) {
        await showFailureToast("No valid structure found in tree string");
        return;
      }

      // Validate the structure
      const validation = TreeCreator.validateTreeStructure(nodes);
      if (!validation.isValid) {
        await showFailureToast(`Invalid tree structure: ${validation.errors.join(", ")}`);
        return;
      }

      // Get root path
      let rootPath = options.rootPath;
      if (!rootPath) {
        try {
          rootPath = await DirectoryUtils.getCurrentDirectory();
        } catch {
          await showFailureToast("Failed to get current directory");
          return;
        }
      }

      // If projectName is provided, create a subdirectory
      if (options.projectName) {
        rootPath = join(rootPath, options.projectName);
      }

      const finalOptions = {
        ...options,
        rootPath,
      };

      setCurrentOptions(finalOptions);

      // Show loading toast
      const loadingToast = await showToast({
        style: Toast.Style.Animated,
        title: "Creating Structure",
        message: "Creating files and directories...",
      });

      // Create the structure
      const creator = new TreeCreator(finalOptions);
      const creationResult = await creator.createFromTree(nodes);

      // Hide loading toast
      await loadingToast.hide();

      // Show success/error toast
      if (creationResult.hasErrors) {
        await showToast({
          style: Toast.Style.Failure,
          title: "Creation Completed with Errors",
          message: `Created ${creationResult.filesCreated + creationResult.directoriesCreated} items, ${creationResult.errors.length} errors`,
        });
      } else {
        await showToast({
          style: Toast.Style.Success,
          title: "Structure Created Successfully",
          message: `Created ${creationResult.directoriesCreated} directories and ${creationResult.filesCreated} files`,
        });
      }

      setResult(creationResult);
      setViewState("result");
    } catch (error) {
      await showFailureToast(`Failed to create structure: ${error}`);
    }
  };

  const handleBack = () => {
    setViewState("form");
  };

  const handleCreateAnother = () => {
    setResult(null);
    setViewState("form");
  };

  if (viewState === "result" && result) {
    return (
      <TreeCreationResultView
        result={result}
        rootPath={currentOptions.rootPath}
        onBack={handleBack}
        onCreateAnother={handleCreateAnother}
      />
    );
  }

  return <TreeCreationForm initialOptions={currentOptions} onSubmit={handleCreateFromTree} />;
}
