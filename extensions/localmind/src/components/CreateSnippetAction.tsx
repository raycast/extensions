import { Action, Icon } from "@raycast/api";
import { CreateSnippetForm } from "./CreateSnippetForm";

export function CreateSnippetAction(props: {
  defaultTitle?: string;
  onCreate: (code: string, content: string) => void;
}) {
  return (
    <Action.Push
      icon={Icon.Pencil}
      title="Create Snippet"
      shortcut={{ modifiers: ["cmd"], key: "n" }}
      target={<CreateSnippetForm defaultTitle={props.defaultTitle} onCreate={props.onCreate} />}
    />
  );
}
