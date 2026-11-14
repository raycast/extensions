import { LaunchProps } from "@raycast/api";
import { MRScope, MRState } from "./components/mr";
import { MyMergeRequests } from "./components/mr_my";

export default function MyMergeRequestsRoot(props: LaunchProps<{ arguments: Arguments.MrMy }>) {
  const scope = props.arguments.scope === MRScope.assigned_to_me ? MRScope.assigned_to_me : MRScope.created_by_me;
  return <MyMergeRequests scope={scope} state={MRState.all} />;
}
