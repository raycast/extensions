import { Action } from "@raycast/api";

export default function CopyTitleAction(props: { title?: string }) {
  return props.title ? (
    <Action.CopyToClipboard
      title="Copy Title"
      content={props.title}
      shortcut={{ modifiers: ["cmd", "shift"], key: "." }}
    />
  ) : null;
}
