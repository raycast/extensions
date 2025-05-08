import { Action, Icon } from "@raycast/api";
import { Prompt } from "../types";

export function TogglePromptAction(props: { prompt: Prompt; onToggle: () => void }) {
  return (
    <Action
      icon={props.prompt.enabled ? Icon.Eye : Icon.EyeDisabled}
      title={props.prompt.enabled ? "Disable" : "Enable"}
      onAction={props.onToggle}
    />
  );
}
