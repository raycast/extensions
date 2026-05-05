import { MyEpicList } from "./components/epic_my";
import { EpicScope, EpicState } from "./gitlabapi";

export default function EpicSearchRoot() {
  return <MyEpicList scope={EpicScope.created_by_me} state={EpicState.all} />;
}
