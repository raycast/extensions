import { LaunchProps } from "@raycast/api";
import { TokenCommand } from "./components/TokenCommand";

export default function Command(props: LaunchProps<{ arguments: Arguments.Jws }>) {
  return <TokenCommand mode="jws" token={props.arguments.token || props.fallbackText} />;
}
