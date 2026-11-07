import { LaunchProps } from "@raycast/api";
import { ChatList } from "./components/ChatList";
import { PreflightGate } from "./components/PreflightGate";
import { isChatLaunchContext } from "./lib/launch-context";

export default function Command(props: LaunchProps) {
  const seed = isChatLaunchContext(props.launchContext) ? props.launchContext.seed : undefined;
  return (
    <PreflightGate>
      <ChatList seed={seed} />
    </PreflightGate>
  );
}
