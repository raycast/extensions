import { LaunchProps } from "@raycast/api";
import { WindowList } from "./window-list";

export default function Command(props: LaunchProps) {
  return <WindowList initialSearch={props.fallbackText ?? ""} />;
}
