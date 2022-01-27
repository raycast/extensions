import { CopyToClipboardAction } from "@raycast/api";

const CopyTitleAction = (props: { title?: string }) => {
  return props.title ? (
    <CopyToClipboardAction
      title="Copy Title"
      content={props.title}
      shortcut={{ modifiers: ["cmd", "shift"], key: "." }}
    />
  ) : null;
};

export default CopyTitleAction;
