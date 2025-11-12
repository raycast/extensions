import { Action, ActionPanel, Detail, Icon, useNavigation } from "@raycast/api";
import { PreviewPromptProps } from "../types";
import PromptForm from "./PromptForm";

const PreviewPrompt = ({ prompt }: PreviewPromptProps) => {
  const { push } = useNavigation();

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
            shortcut={{ modifiers: ["cmd"], key: "e" }}
            onAction={() => push(<PromptForm />)}
          />
        </ActionPanel>
      }
    />
  );
};

export default PreviewPrompt;
