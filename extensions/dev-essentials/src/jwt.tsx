import { LaunchProps } from "@raycast/api";
import { TokenCommand } from "./components/TokenCommand";

export default function Command(props: LaunchProps<{ arguments: Arguments.Jwt }>) {
  return <TokenCommand mode="jwt" token={props.arguments.token || props.fallbackText} />;
}
