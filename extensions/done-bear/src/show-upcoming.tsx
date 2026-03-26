import { withAccessToken } from "@raycast/utils";
import TaskList from "./components/task-list";
import { oauthService } from "./oauth";

function ShowUpcoming() {
  return <TaskList view="upcoming" />;
}

export default withAccessToken(oauthService)(ShowUpcoming);
