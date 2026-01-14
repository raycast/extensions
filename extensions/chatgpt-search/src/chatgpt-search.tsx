import { LaunchProps } from "@raycast/api";
import { executeSearchToOpen } from "./executeSearchToOpen";

export default function Command(props: LaunchProps<{ arguments: Arguments.ChatgptSearch }>) {
  if (props.arguments.query) {
    executeSearchToOpen({ query: props.arguments.query });
  }
  return null;
}
