import { LaunchProps } from "@raycast/api";

import InstanceCommand from "./components/InstanceCommand";
import AskDeepSearchCommand from "./components/AskDeepSearchCommand";

export default function DeepSearchInstance(props: LaunchProps) {
  return <InstanceCommand Command={AskDeepSearchCommand} props={props} />;
}
