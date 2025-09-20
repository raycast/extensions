import { Action, Icon } from "@raycast/api";
import { AddStorybookForm } from "./AddStorybookForm";

export default function AddStorybookAction(props: { onCreate: (name: string, url: string) => void }) {
  return (
    <Action.Push
      icon={Icon.Pencil}
      title="Add Storybook"
      shortcut={{ modifiers: ["cmd"], key: "n" }}
      target={<AddStorybookForm onCreate={props.onCreate} />}
    />
  );
}
