import { Action, ActionPanel, Detail, Icon, openExtensionPreferences, Keyboard } from "@raycast/api";
import { getAIConfig, ChatMessage } from "../ai/llm";
import { useAIGeneration } from "../ai/useAIGeneration";

/** Detail view that streams an AI generated report from the configured (local) LLM. */
export function AIReportView(props: {
  title: string;
  messages: ChatMessage[];
  sourceMarkdown: string;
  logsCount: number;
}) {
  const { text, isLoading, error, regenerate } = useAIGeneration(props.messages);
  const config = getAIConfig();

  const markdown = error
    ? `## Could not generate the ${props.title.toLowerCase()}\n\n${error.message}\n\n` +
      `You can change the AI server and model in the extension preferences (⌘ ⇧ ,).\n\n---\n\n` +
      `### Your logs\n\n${props.sourceMarkdown}`
    : `# ${props.title}\n\n${text || (isLoading ? `_Asking ${config.model}…_` : "")}`;

  return (
    <Detail
      navigationTitle={props.title}
      isLoading={isLoading}
      markdown={markdown}
      metadata={
        <Detail.Metadata>
          <Detail.Metadata.Label title="Model" text={config.model} icon={Icon.ComputerChip} />
          <Detail.Metadata.Label title="Server" text={config.baseUrl} />
          {config.thinking && config.thinking !== "default" && (
            <Detail.Metadata.Label title="Thinking" text={config.thinking === "none" ? "Disabled" : config.thinking} />
          )}
          {config.extraParams && <Detail.Metadata.Label title="Extra Parameters" text={config.extraParams} />}
          <Detail.Metadata.Label title="Logs" text={String(props.logsCount)} />
        </Detail.Metadata>
      }
      actions={
        <ActionPanel>
          {text && !error && <Action.CopyToClipboard title="Copy Text" content={text} />}
          {text && !error && <Action.Paste title="Paste Text" content={text} />}
          <Action
            icon={Icon.ArrowClockwise}
            title="Regenerate"
            shortcut={Keyboard.Shortcut.Common.Refresh}
            onAction={regenerate}
          />
          <Action.CopyToClipboard
            title="Copy Logs as Markdown"
            content={props.sourceMarkdown}
            shortcut={Keyboard.Shortcut.Common.Copy}
          />
          <Action icon={Icon.Gear} title="Configure AI" onAction={openExtensionPreferences} />
        </ActionPanel>
      }
    />
  );
}
