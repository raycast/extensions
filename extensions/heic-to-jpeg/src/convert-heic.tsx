import {
  Action,
  ActionPanel,
  Icon,
  List,
  open,
  showToast,
  Toast,
} from "@raycast/api";
import { useState } from "react";
import { convertMultipleFiles, ConversionResult } from "./utils/converter";
import { exec } from "child_process";
import { promisify } from "util";

const execAsync = promisify(exec);

export default function ConvertHeic() {
  const [results, setResults] = useState<ConversionResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  async function selectAndConvert() {
    try {
      // Open file picker dialog for HEIC files
      const script = `
        set theFiles to choose file with prompt "Select HEIC files to convert" of type {"public.heic", "public.heif"} with multiple selections allowed
        set pathList to {}
        repeat with aFile in theFiles
          set end of pathList to POSIX path of aFile
        end repeat
        return pathList
      `;
      const { stdout } = await execAsync(`osascript -e '${script}'`);

      const paths = stdout
        .trim()
        .split(", ")
        .map((p) => p.trim())
        .filter((p) => p.length > 0);

      if (paths.length === 0) {
        await showToast({
          style: Toast.Style.Failure,
          title: "No files selected",
        });
        return;
      }

      setIsLoading(true);
      await showToast({
        style: Toast.Style.Animated,
        title: `Converting ${paths.length} file(s)...`,
      });

      const conversionResults = await convertMultipleFiles(paths);
      setResults(conversionResults);

      const successCount = conversionResults.filter((r) => r.success).length;
      const failCount = conversionResults.length - successCount;

      if (failCount === 0) {
        await showToast({
          style: Toast.Style.Success,
          title: `Converted ${successCount} file(s)`,
        });
      } else {
        await showToast({
          style: Toast.Style.Failure,
          title: `${successCount} converted, ${failCount} failed`,
        });
      }
    } catch (error) {
      if (error instanceof Error && error.message.includes("User canceled")) {
        // User cancelled the dialog, ignore
        return;
      }
      await showToast({
        style: Toast.Style.Failure,
        title: "Error selecting files",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <List isLoading={isLoading}>
      {results.length === 0 ? (
        <List.EmptyView
          icon={Icon.Image}
          title="Convert HEIC to JPEG"
          description="Press Enter to select HEIC files"
          actions={
            <ActionPanel>
              <Action
                title="Select Files"
                icon={Icon.Finder}
                onAction={selectAndConvert}
              />
            </ActionPanel>
          }
        />
      ) : (
        results.map((result, index) => (
          <List.Item
            key={index}
            icon={result.success ? Icon.CheckCircle : Icon.XMarkCircle}
            title={result.inputPath.split("/").pop() || result.inputPath}
            subtitle={result.success ? "Converted" : result.error}
            accessories={[
              {
                text: result.success
                  ? result.outputPath.split("/").pop()
                  : undefined,
                icon: result.success ? Icon.ArrowRight : undefined,
              },
            ]}
            actions={
              <ActionPanel>
                <Action
                  title="Select More Files"
                  icon={Icon.Finder}
                  onAction={selectAndConvert}
                />
                {result.success && (
                  <>
                    <Action
                      title="Open Jpeg"
                      icon={Icon.Eye}
                      onAction={() => open(result.outputPath)}
                    />
                    <Action.ShowInFinder path={result.outputPath} />
                  </>
                )}
              </ActionPanel>
            }
          />
        ))
      )}
    </List>
  );
}
