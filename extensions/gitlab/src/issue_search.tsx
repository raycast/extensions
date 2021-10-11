import { render } from "@raycast/api";
import { IssueList, IssueScope, IssueState } from "./components/issues";

render(<IssueList scope={IssueScope.created_by_me} state={IssueState.all} />);
