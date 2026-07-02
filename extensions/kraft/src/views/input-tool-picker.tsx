import { Action, ActionPanel, confirmAlert, environment, Icon, List, showToast, Toast } from "@raycast/api";
import { useEffect, useRef } from "react";
import { deleteCustomToolByMode, isCustomToolMode } from "../custom-tools";
import { useAppSettings } from "../hooks/useAppSettings";
import { useHistory } from "../hooks/useHistory";
import { sortExecutionToolsByUsage } from "../tool-usage";
import { executionTools, ToolDefinition } from "../tools";
import { useCustomTools } from "../hooks/useCustomTools";
import { getToolIcon } from "../tool-icons";
import { removeOcrTempImage } from "../runtime/ocr-temp";

type InputToolPickerProps = {
  sourceTitle: string;
  inputText: string;
  ocrImage?: string;
  onSelectTool: (context: Record<string, unknown>) => void;
};

function buildExecutionContext(
  tool: ToolDefinition,
  inputText: string,
  ocrImage: string | undefined,
  autoStart: boolean,
) {
  return {
    mode: tool.mode,
    txt: inputText,
    img: ocrImage,
    autoStart,
  };
}

function codeBlock(value: string) {
  const matches = value.match(/`+/g) ?? [];
  const maxFenceLength = matches.reduce((max, match) => Math.max(max, match.length), 0);
  const fence = "`".repeat(Math.max(3, maxFenceLength + 1));
  return `${fence}\n${value}\n${fence}`;
}

function imageMarkdown(path: string | undefined) {
  return path ? `\n![](<${path.replaceAll(">", "%3E")}>)\n` : "";
}

async function deleteCustomTool(tool: ToolDefinition, reloadTools: () => Promise<void>) {
  if (!isCustomToolMode(tool.mode)) {
    return;
  }
  if (!(await confirmAlert({ title: "Delete Text Tool?", message: tool.title }))) {
    return;
  }
  const deleted = await deleteCustomToolByMode(environment.supportPath, tool.mode);
  await reloadTools();
  await showToast({
    title: deleted ? "Text tool deleted" : "Text tool was already removed",
    message: tool.title,
    style: deleted ? Toast.Style.Success : Toast.Style.Failure,
  });
}

export function InputToolPicker({ sourceTitle, inputText, ocrImage, onSelectTool }: InputToolPickerProps) {
  const appSettings = useAppSettings();
  const history = useHistory(appSettings.data);
  const customTools = useCustomTools();
  const sortedTools = sortExecutionToolsByUsage([...executionTools, ...customTools.data], history.data);
  const passedToExecution = useRef(false);

  useEffect(() => {
    return () => {
      if (!passedToExecution.current) {
        removeOcrTempImage(ocrImage);
      }
    };
  }, [ocrImage]);

  function selectTool(context: Record<string, unknown>) {
    passedToExecution.current = true;
    onSelectTool(context);
  }

  return (
    <List
      isLoading={appSettings.isLoading || history.isLoading || customTools.isLoading}
      isShowingDetail
      selectedItemId={sortedTools[0]?.id}
      searchBarPlaceholder="Choose tool or workflow..."
      navigationTitle={sourceTitle}
    >
      <List.Section title="Input">
        <List.Item
          id="input-preview"
          icon={ocrImage ? Icon.Image : Icon.Text}
          title="Input Preview"
          subtitle={inputText}
          accessories={[{ text: `${inputText.length.toLocaleString()} chars` }]}
          detail={<List.Item.Detail markdown={`${imageMarkdown(ocrImage)}**Input**\n\n${codeBlock(inputText)}\n`} />}
          actions={
            <ActionPanel>
              <Action.CopyToClipboard title="Copy Input" content={inputText} />
            </ActionPanel>
          }
        />
      </List.Section>
      <List.Section title="Tools">
        {sortedTools.map((tool) => {
          const usageCount = history.data?.filter((record) => record.mode === tool.mode).length ?? 0;
          const icon = getToolIcon(tool);
          return (
            <List.Item
              key={tool.id}
              icon={icon}
              title={tool.title}
              subtitle={tool.subtitle}
              accessories={usageCount > 0 ? [{ text: `${usageCount}` }] : undefined}
              detail={
                <List.Item.Detail
                  markdown={`## ${tool.title}\n\n${tool.description}\n\n---\n\n**Input**\n\n${codeBlock(inputText)}\n`}
                />
              }
              actions={
                <ActionPanel>
                  <Action
                    title={`Run ${tool.title}`}
                    icon={icon}
                    onAction={() => selectTool(buildExecutionContext(tool, inputText, ocrImage, true))}
                  />
                  <Action
                    title={`Open in ${tool.title}`}
                    icon={Icon.ArrowRight}
                    onAction={() => selectTool(buildExecutionContext(tool, inputText, ocrImage, false))}
                  />
                  {isCustomToolMode(tool.mode) && (
                    <ActionPanel.Section title="Manage">
                      <Action
                        title="Delete Text Tool"
                        icon={{ source: Icon.Trash, tintColor: "red" }}
                        style={Action.Style.Destructive}
                        shortcut={{ modifiers: ["cmd", "shift"], key: "backspace" }}
                        onAction={() => deleteCustomTool(tool, customTools.reload)}
                      />
                    </ActionPanel.Section>
                  )}
                </ActionPanel>
              }
            />
          );
        })}
      </List.Section>
    </List>
  );
}
