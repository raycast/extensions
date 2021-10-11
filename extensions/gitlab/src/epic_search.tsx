import { render } from "@raycast/api";
import { MyEpicList } from "./components/epic_my";
import { EpicScope, EpicState } from "./gitlabapi";

render(<MyEpicList scope={EpicScope.created_by_me} state={EpicState.all} />);
