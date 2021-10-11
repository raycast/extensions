import { render } from "@raycast/api";
import { IssueList, IssueScope, IssueState } from "./components/issues";

render(<IssueList scope={IssueScope.assigned_to_me} state={IssueState.opened} />);
