import { Action, ActionPanel, Detail, Icon, useNavigation } from "@raycast/api";
import { PreviewPromptProps } from "../types";

const PreviewPrompt = ({ prompt }: PreviewPromptProps) => {
  const { pop } = useNavigation();

  return (
    <Detail
      navigationTitle="Generated Prompt"
      markdown={`\`\`\`\n${prompt}\n\`\`\``}
      actions={
        <ActionPanel>
          <Action.CopyToClipboard title="Copy Prompt" content={prompt} />
          <Action
            icon={Icon.Pencil}
            title="Edit Prompt"
            shortcut={{
              macOS: { modifiers: ["cmd"], key: "e" },
              windows: { modifiers: ["ctrl"], key: "e" },
            }}
            onAction={() => pop()}
          />
        </ActionPanel>
      }
    />
  );
};

export default PreviewPrompt;
