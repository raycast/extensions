import { Action, ActionPanel, Detail, Icon, List, showToast, Toast } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import { useState } from "react";
import path from "node:path";
import { FontFileSelection } from "./components/font-file-selection";
import { convertFont, getFontFormat, OUTPUT_FORMATS, type ConversionResult, type OutputFormat } from "./lib/fonts";

type ConversionState = { kind: "idle" } | { kind: "converting" } | { kind: "success"; result: ConversionResult };

export default function Command() {
  return (
    <FontFileSelection>
      {(filePath, chooseAnotherFile) => <ConvertFont filePath={filePath} chooseAnotherFile={chooseAnotherFile} />}
    </FontFileSelection>
  );
}

function ConvertFont(props: { filePath: string; chooseAnotherFile: () => void }) {
  const [state, setState] = useState<ConversionState>({ kind: "idle" });
  const inputFormat = getFontFormat(props.filePath);

  async function handleConvert(targetFormat: OutputFormat) {
    if (state.kind === "converting") return;
    setState({ kind: "converting" });
    const toast = await showToast({ style: Toast.Style.Animated, title: "Converting font..." });
    try {
      const result = await convertFont({ filePath: props.filePath, targetFormat });
      setState({ kind: "success", result });
      toast.style = Toast.Style.Success;
      toast.title = result.warnings.length ? "Converted with a warning" : "Conversion successful";
      toast.message = result.warnings[0] || `Saved to ${path.basename(result.outputPath)}`;
    } catch (error) {
      setState({ kind: "idle" });
      await showFailureToast(error, { title: "Conversion failed" });
    }
  }

  return (
    <List isLoading={state.kind === "converting"} searchBarPlaceholder="Select output format...">
      {state.kind === "success" && (
        <List.Section title="Converted Font">
          <List.Item
            title={path.basename(state.result.outputPath)}
            subtitle={state.result.outputPath}
            icon={Icon.CheckCircle}
            actions={
              <ActionPanel>
                <Action.ShowInFinder
                  title={process.platform === "win32" ? "Show in File Explorer" : "Show in Finder"}
                  path={state.result.outputPath}
                />
                <Action.CopyToClipboard title="Copy Output Path" content={state.result.outputPath} />
                <Action title="Choose Another Font" icon={Icon.Document} onAction={props.chooseAnotherFile} />
              </ActionPanel>
            }
          />
          {state.result.warnings.map((warning) => (
            <List.Item
              key={warning}
              title="Outline Conversion Warning"
              subtitle={warning}
              icon={Icon.Warning}
              actions={
                <ActionPanel>
                  <Action.Push title="Read Warning" target={<Detail markdown={warning} />} />
                </ActionPanel>
              }
            />
          ))}
        </List.Section>
      )}
      <List.Section title={`Selected File: ${path.basename(props.filePath)}`}>
        {OUTPUT_FORMATS.filter((format) => format !== inputFormat).map((format) => (
          <List.Item
            key={format}
            title={`Convert to ${format.toUpperCase()}`}
            icon={Icon.Text}
            actions={
              <ActionPanel>
                <Action title="Convert" onAction={() => handleConvert(format)} />
                <Action title="Choose Another Font" icon={Icon.Document} onAction={props.chooseAnotherFile} />
              </ActionPanel>
            }
          />
        ))}
      </List.Section>
    </List>
  );
}
