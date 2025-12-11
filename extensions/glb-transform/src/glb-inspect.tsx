import {
  ActionPanel,
  Action,
  Detail,
  showHUD,
  getSelectedFinderItems,
  Toast,
  showToast,
  popToRoot,
} from "@raycast/api";
import { useState, useEffect } from "react";
import path from "path";
import { execAsync, execOptions } from "./utils";

interface InspectionResult {
  file: string;
  markdown: string | null;
  error: string | null;
}

// Function to run the gltf-transform inspect command
async function inspectGlb(filePath: string): Promise<InspectionResult> {
  const fileName = path.basename(filePath);
  const command = `gltf-transform inspect "${filePath}" --format md`;

  try {
    // Run the command
    const { stdout } = await execAsync(command, execOptions);

    // The output is the Markdown content
    return {
      file: fileName,
      markdown: stdout,
      error: null,
    };
  } catch (error) {
    console.error(`Error inspecting ${fileName}:`, error);
    const errorMessage = error instanceof Error ? error.message : String(error);

    return {
      file: fileName,
      markdown: null,
      error: `Failed to inspect file:\n\n${errorMessage}`,
    };
  }
}

// Main Raycast Component
export default function Command() {
  const [isLoading, setIsLoading] = useState(true);
  const [results, setResults] = useState<InspectionResult[]>([]);
  const [selectedFileIndex, setSelectedFileIndex] = useState(0);

  useEffect(() => {
    async function runInspection() {
      setIsLoading(true);
      try {
        // 1. Get selected items from Finder
        const selectedItems = await getSelectedFinderItems();

        if (selectedItems.length === 0) {
          await showHUD("❌ No files selected in Finder");
          await popToRoot();
          return;
        }

        // 2. Filter for GLB files
        const glbFiles = selectedItems.filter((item) => item.path.toLowerCase().endsWith(".glb"));

        if (glbFiles.length === 0) {
          await showHUD("❌ No GLB files selected");
          await popToRoot();
          return;
        }

        // Show a toast while processing
        const toast = await showToast({
          style: Toast.Style.Animated,
          title: "Inspecting GLB files...",
          message: `Processing ${glbFiles.length} file${glbFiles.length > 1 ? "s" : ""}`,
        });

        // 3. Process all selected GLB files
        const inspectionPromises = glbFiles.map((file) => inspectGlb(file.path));
        const inspectionResults = await Promise.all(inspectionPromises);

        setResults(inspectionResults);
        setSelectedFileIndex(0); // Start with the first file

        toast.style = Toast.Style.Success;
        toast.title = "Inspection Complete";
        toast.message = `Analyzed ${inspectionResults.length} file${inspectionResults.length > 1 ? "s" : ""}`;
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        await showToast({
          style: Toast.Style.Failure,
          title: "Inspection Failed",
          message: errorMessage.includes("Finder") ? "Select files in Finder first" : `Error: ${errorMessage}`,
        });
        await popToRoot();
      } finally {
        setIsLoading(false);
      }
    }
    runInspection();
  }, []);

  const currentResult = results[selectedFileIndex];

  // Fallback for initial loading or when inspection is pending
  if (isLoading || !currentResult) {
    return <Detail isLoading={true} />;
  }

  // Handle error case
  if (currentResult.error) {
    return (
      <Detail
        isLoading={false}
        markdown={`# ❌ Inspection Failed: ${currentResult.file}\n\n${currentResult.error}`}
        actions={
          <ActionPanel>
            <Action
              title="Select Next File"
              onAction={() => setSelectedFileIndex((i) => (i + 1) % results.length)}
              shortcut={{ modifiers: ["cmd"], key: "arrowRight" }}
            />
            <Action
              title="Select Previous File"
              onAction={() => setSelectedFileIndex((i) => (i - 1 + results.length) % results.length)}
              shortcut={{ modifiers: ["cmd"], key: "arrowLeft" }}
            />
          </ActionPanel>
        }
      />
    );
  }

  // Successfully inspected file
  const markdownContent = `# 🔎 GLB Analysis: ${currentResult.file}\n\n${currentResult.markdown}`;

  return (
    <Detail
      navigationTitle={currentResult.file}
      isLoading={false}
      markdown={markdownContent}
      actions={
        <ActionPanel>
          {/* Navigation Actions for multiple files */}
          {results.length > 1 && (
            <>
              <Action
                title="Next File"
                onAction={() => setSelectedFileIndex((i) => (i + 1) % results.length)}
                shortcut={{ modifiers: ["cmd"], key: "arrowRight" }}
              />
              <Action
                title="Previous File"
                onAction={() => setSelectedFileIndex((i) => (i - 1 + results.length) % results.length)}
                shortcut={{ modifiers: ["cmd"], key: "arrowLeft" }}
              />
              {/* <Action. /> */}
            </>
          )}
          <Action.OpenInBrowser title="View Gltf-Transform Documentation" url="https://gltf-transform.dev/cli.html" />
          <Action.CopyToClipboard title="Copy Analysis Markdown" content={markdownContent} />
        </ActionPanel>
      }
    />
  );
}
