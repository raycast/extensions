import { LaunchProps } from "@raycast/api";
import { openLittleChrome, toUrl } from "./open-little-chrome";

export default async function Command(props: LaunchProps<{ arguments: Arguments.OpenUrl }>) {
  await openLittleChrome(toUrl(props.arguments.url));
}
