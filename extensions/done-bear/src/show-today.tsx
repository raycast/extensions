import { withAccessToken } from "@raycast/utils";
import TaskList from "./components/task-list";
import { oauthService } from "./oauth";

function ShowToday() {
  return <TaskList view="today" />;
}

export default withAccessToken(oauthService)(ShowToday);
