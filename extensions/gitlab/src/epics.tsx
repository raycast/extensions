import { MyEpicList } from "./components/epic_my";
import { EpicScope, EpicState } from "./gitlabapi";

export default function EpicsRoot() {
  return <MyEpicList scope={EpicScope.all} state={EpicState.all} />;
}
