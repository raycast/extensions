import { Action, ActionPanel, Detail, Image } from "@raycast/api";
import CancelAction from "./CancelAction";

export type MessageChoice = { title: string; icon: Image.ImageLike; onAction: () => void };

type Props = { title: string; markdown: string; choices: MessageChoice[]; onCancel: () => void };

export default function MessagePrompt({ title, markdown, choices, onCancel }: Props) {
  return (
    <Detail
      navigationTitle={title}
      markdown={markdown}
      actions={
        <ActionPanel>
          {choices.map((choice) => (
            <Action key={choice.title} title={choice.title} icon={choice.icon} onAction={choice.onAction} />
          ))}
          <CancelAction onCancel={onCancel} />
        </ActionPanel>
      }
    />
  );
}
