import { withAccessToken } from "@raycast/utils";
import TaskList from "./components/task-list";
import { oauthService } from "./oauth";

function ShowInbox() {
  return <TaskList view="inbox" />;
}

export default withAccessToken(oauthService)(ShowInbox);
