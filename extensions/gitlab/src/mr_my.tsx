import { MRScope, MRState } from "./components/mr";
import { MyMergeRequests } from "./components/mr_my";

export default function MyMergeRequestsRoot() {
  return <MyMergeRequests scope={MRScope.created_by_me} state={MRState.all} />;
}
