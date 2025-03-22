import { Action, Icon } from "@raycast/api";
import CreatePileForm from "../forms/CreatePileForm";

export default function CreatePileAction(props: {
  onCreate: (name: string, theme: "light" | "dark", path: string) => void;
}) {
  return (
    <Action.Push
      icon={Icon.Plus}
      title="Create Pile"
      shortcut={{ modifiers: ["cmd", "shift"], key: "n" }}
      target={<CreatePileForm onCreate={props.onCreate} />}
    />
  );
}
