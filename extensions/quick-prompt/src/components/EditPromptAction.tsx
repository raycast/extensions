import { Action, Icon } from "@raycast/api";
import { Prompt } from "../types";
import { EditPromptForm } from "./EditPromptForm";

export function EditPromptAction(props: { prompt: Prompt; onEdit: (prompt: Prompt) => void }) {
  return (
    <Action.Push
      icon={Icon.Pencil}
      title={`Edit ${props.prompt.title}`}
      shortcut={{ modifiers: ["cmd"], key: "e" }}
      target={<EditPromptForm prompt={props.prompt} onEdit={props.onEdit} />}
    />
  );
}
