import { LaunchProps } from "@raycast/api";
import convertPath from "./core/main-convert";

interface PathArgument {
  path: string;
}

/**
 * Convert a Windows path into a Linux one with the prefix /mnt/
 * @param props Windows path
 */
export default async function main(props: LaunchProps<{ arguments: PathArgument }>) {
  await convertPath(props.arguments.path, "/mnt/");
}
