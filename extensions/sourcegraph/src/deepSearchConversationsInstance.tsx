import { LaunchProps } from "@raycast/api";

import ViewDeepSearchConversationsCommand from "./components/ViewDeepSearchConversationsCommand";
import InstanceCommand from "./components/InstanceCommand";

export default function DeepSearchConversationsInstance(props: LaunchProps) {
  return <InstanceCommand Command={ViewDeepSearchConversationsCommand} props={props} />;
}
