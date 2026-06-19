import { LaunchProps } from "@raycast/api";
import Command from "./move-to-folder";

export default function CopyToFolder(props: LaunchProps) {
  return Command({ ...props, arguments: { ...props.arguments, mode: "copy" } });
}
