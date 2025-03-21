import { MyEpicList } from "./components/epic_my";
import { EpicScope, EpicState } from "./gitlabapi";

export default function EpicsRoot(): JSX.Element {
  return <MyEpicList scope={EpicScope.all} state={EpicState.all} />;
}
