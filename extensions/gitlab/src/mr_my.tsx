import { LaunchProps } from "@raycast/api";
import { MRScope, MRState } from "./components/mr";
import { MyMergeRequests } from "./components/mr_my";

export default function MyMergeRequestsRoot(props: LaunchProps<{ arguments: Arguments.MrMy }>) {
  const argumentScope = props.arguments.scope;
  const scope =
    argumentScope === MRScope.assigned_to_me ||
    argumentScope === MRScope.created_by_me ||
    argumentScope === MRScope.reviews_for_me ||
    argumentScope === MRScope.all
      ? argumentScope
      : undefined;
  return <MyMergeRequests scope={scope} state={MRState.all} />;
}
