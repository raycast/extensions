import { withAccessToken } from "@raycast/utils";
import TaskList from "./components/task-list";
import { oauthService } from "./oauth";

function ShowSomeday() {
  return <TaskList view="someday" />;
}

export default withAccessToken(oauthService)(ShowSomeday);
