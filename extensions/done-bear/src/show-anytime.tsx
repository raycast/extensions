import { withAccessToken } from "@raycast/utils";
import TaskList from "./components/task-list";
import { oauthService } from "./oauth";

function ShowAnytime() {
  return <TaskList view="anytime" />;
}

export default withAccessToken(oauthService)(ShowAnytime);
