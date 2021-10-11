import { render } from "@raycast/api";
import { MyEpicList } from "./components/epic_my";
import { EpicScope, EpicState } from "./gitlabapi";

render(<MyEpicList scope={EpicScope.all} state={EpicState.all} />);
