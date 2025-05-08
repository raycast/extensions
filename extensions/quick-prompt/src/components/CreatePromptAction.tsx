import { Action, Icon } from "@raycast/api";
import { CreatePromptForm } from "./CreatePromptForm";

export function CreatePromptAction(props: {
  defaultTitle?: string;
  onCreate: (values: { title: string; content: string; tags: string; enabled: boolean }) => void;
}) {
  return (
    <Action.Push
      icon={Icon.Plus}
      title="Create Prompt"
      shortcut={{ modifiers: ["cmd"], key: "n" }}
      target={<CreatePromptForm defaultTitle={props.defaultTitle} onCreate={props.onCreate} />}
    />
  );
}
