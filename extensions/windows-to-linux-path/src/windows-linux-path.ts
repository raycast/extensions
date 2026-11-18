import { LaunchProps } from "@raycast/api";
import convertPath from "./core/main-convert";

/**
 * Convert a Windows path into a Linux one with the prefix /
 * @param props Windows path
 */
export default async function main(props: LaunchProps<{ arguments: Arguments.WindowsLinuxPath }>) {
  await convertPath(props.arguments.path, "/");
}
