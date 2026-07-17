import { Action, Icon } from "@raycast/api";
import { CustomCommandView } from "../components/custom-command-view";

export const CreateCustomCommandAction = () => {
  return (
    <Action.Push
      title="Create Command"
      shortcut={{ modifiers: ["cmd"], key: "n" }}
      target={<CustomCommandView />}
      icon={Icon.Plus}
    />
  );
};
