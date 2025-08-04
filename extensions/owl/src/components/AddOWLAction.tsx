import { Action, Icon } from "@raycast/api";
import { AddOWL } from "./AddOWL";

export function AddOWLAction(
  props: Readonly<
    Omit<Action.Push.Props, "title" | "target"> & {
      base?: string;
    }
  >,
) {
  return (
    <Action.Push
      title={"Add Owl"}
      icon={Icon.NewDocument}
      shortcut={{
        modifiers: ["cmd"],
        key: "n",
      }}
      {...props}
      target={<AddOWL base={props.base} />}
    />
  );
}
