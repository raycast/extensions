import { Action } from "@raycast/api";

export interface ActionDebugJsonProps {
  data: object;
  title?: string;
}

export function ActionDebugJson(props: ActionDebugJsonProps) {
  if (process.env.NODE_ENV !== "development") {
    return null;
  }
  return (
    <Action.CopyToClipboard
      title={props.title ?? "Copy Debug JSON"}
      content={JSON.stringify(props.data, null, 2)}
    />
  );
}
