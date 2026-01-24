import {
  Action,
  ActionPanel,
  Icon,
  List,
  open,
  showToast,
  Toast,
} from "@raycast/api";
import { useEffect, useState } from "react";
import {
  convertMultipleFiles,
  ConversionResult,
  getFinderSelection,
} from "./utils/converter";
import path from "path";

export default function ConvertSelected() {
  const [results, setResults] = useState<ConversionResult[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [noSelection, setNoSelection] = useState(false);

  async function convertSelection() {
    setIsLoading(true);
    setNoSelection(false);

    try {
      const selectedPaths = await getFinderSelection();

      // Filter for HEIC files
      const heicPaths = selectedPaths.filter((p) => {
        const ext = path.extname(p).toLowerCase();
        return ext === ".heic" || ext === ".heif";
      });

      if (heicPaths.length === 0) {
        setNoSelection(true);
        setIsLoading(false);
        await showToast({
          style: Toast.Style.Failure,
          title: "No HEIC files selected",
          message: "Select HEIC files in Finder first",
        });
        return;
      }

      await showToast({
        style: Toast.Style.Animated,
        title: `Converting ${heicPaths.length} file(s)...`,
      });

      const conversionResults = await convertMultipleFiles(heicPaths);
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
      await showToast({
        style: Toast.Style.Failure,
        title: "Error",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    convertSelection();
  }, []);

  if (noSelection) {
    return (
      <List>
        <List.EmptyView
          icon={Icon.Finder}
          title="No HEIC Files Selected"
          description="Select HEIC files in Finder, then run this command"
          actions={
            <ActionPanel>
              <Action
                title="Retry"
                icon={Icon.ArrowClockwise}
                onAction={convertSelection}
              />
            </ActionPanel>
          }
        />
      </List>
    );
  }

  return (
    <List isLoading={isLoading}>
      {results.length === 0 && !isLoading ? (
        <List.EmptyView
          icon={Icon.Finder}
          title="No HEIC Files Selected"
          description="Select HEIC files in Finder, then run this command"
          actions={
            <ActionPanel>
              <Action
                title="Retry"
                icon={Icon.ArrowClockwise}
                onAction={convertSelection}
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
                  title="Retry Conversion"
                  icon={Icon.ArrowClockwise}
                  onAction={convertSelection}
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
