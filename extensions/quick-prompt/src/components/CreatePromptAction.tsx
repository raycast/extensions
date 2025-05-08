import { Action, Icon } from "@raycast/api";
import { CreatePromptForm } from "./CreatePromptForm";
import { PromptFormValues } from "../types";

export function CreatePromptAction(props: { defaultTitle?: string; onCreate: (values: PromptFormValues) => void }) {
  return (
    <Action.Push
      icon={Icon.Plus}
      title="Create Prompt"
      shortcut={{ modifiers: ["cmd"], key: "n" }}
      target={<CreatePromptForm defaultTitle={props.defaultTitle} onCreate={props.onCreate} />}
    />
  );
}
