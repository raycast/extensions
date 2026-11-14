import { LaunchProps } from "@raycast/api";
import { TokenCommand } from "./components/TokenCommand";

export default function Command(props: LaunchProps<{ arguments: Arguments.Jwe }>) {
  return <TokenCommand mode="jwe" token={props.arguments.token || props.fallbackText} />;
}
