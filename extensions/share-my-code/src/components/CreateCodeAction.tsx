import { Action, Icon, LaunchType } from "@raycast/api";
import CreateCommand from "../create";

export default function CreateCodeAction(props: { slug: string }) {
  return (
    <Action.Push
      title="Create A New ShareMyCode"
      icon={Icon.Pencil}
      shortcut={{ modifiers: ["cmd"], key: "n" }}
      target={<CreateCommand arguments={{ slug: props.slug || "" }} launchType={LaunchType.UserInitiated} />}
    />
  );
}
