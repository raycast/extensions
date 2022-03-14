import { MRScope, MRState } from "./components/mr";
import { MyMergeRequests } from "./components/mr_my";

export default function MyMergeRequestsRoot(): JSX.Element {
  return <MyMergeRequests scope={MRScope.assigned_to_me} state={MRState.all} />;
}
