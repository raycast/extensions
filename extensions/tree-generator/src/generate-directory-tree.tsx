import { useState, useEffect } from "react";
import { homedir } from "os";
import { TreeGeneratorOptions, TreeGenerationResult } from "./types";
import { TreeGenerator, DirectoryUtils, PreferenceUtils } from "./utils";
import { TreeOptionsForm, TreeResultView } from "./components";

type ViewState = "form" | "result";

/**
 * Main command component for generating directory trees
 */
export default function GenerateDirectoryTreeCommand() {
  const [viewState, setViewState] = useState<ViewState>("form");
  const [result, setResult] = useState<TreeGenerationResult | null>(null);
  const [isInitializing, setIsInitializing] = useState(true);

  // Initialize with preferences-based defaults
  const getInitialOptions = (): TreeGeneratorOptions => {
    try {
      return PreferenceUtils.getDefaultTreeOptions("");
    } catch {
      // Fallback if preferences can't be read
      return {
        maxDepth: 3,
        respectGitignore: true,
        showHidden: false,
        directoriesOnly: false,
        showSizes: false,
        showCounts: true,
        ignorePatterns: [],
        rootPath: "",
      };
    }
  };

  const [currentOptions, setCurrentOptions] = useState<TreeGeneratorOptions>(getInitialOptions());

  // Initialize with current directory
  useEffect(() => {
    const initializeDirectory = async () => {
      try {
        const currentDir = await DirectoryUtils.getCurrentDirectorySilent();
        const defaultOptions = PreferenceUtils.getDefaultTreeOptions(currentDir);
        setCurrentOptions(defaultOptions);
      } catch (error) {
        console.error("Failed to get current directory:", error);
        // Fallback to home directory
        const fallbackOptions = PreferenceUtils.getDefaultTreeOptions(homedir());
        setCurrentOptions(fallbackOptions);
      } finally {
        setIsInitializing(false);
      }
    };

    initializeDirectory();
  }, []);

  const handleGenerateTree = async (options: TreeGeneratorOptions) => {
    // Use current directory if no path specified
    const finalOptions = {
      ...options,
      rootPath: options.rootPath || (await DirectoryUtils.getCurrentDirectory()),
    };

    setCurrentOptions(finalOptions);

    const generator = new TreeGenerator(finalOptions);
    const treeResult = await generator.generateTree();

    setResult(treeResult);
    setViewState("result");
  };

  const handleBack = () => {
    setViewState("form");
  };

  const handleRegenerate = async () => {
    if (currentOptions) {
      await handleGenerateTree(currentOptions);
    }
  };

  if (viewState === "result" && result) {
    return (
      <TreeResultView
        result={result}
        rootPath={currentOptions.rootPath}
        onBack={handleBack}
        onRegenerate={handleRegenerate}
      />
    );
  }

  return (
    <TreeOptionsForm initialOptions={currentOptions} onSubmit={handleGenerateTree} isInitializing={isInitializing} />
  );
}
