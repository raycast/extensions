import { withAccessToken } from "@raycast/utils";

import TaskList from "./components/task-list";
import { oauthService } from "./oauth";

const ShowSomeday = () => <TaskList view="someday" />;

export default withAccessToken(oauthService)(ShowSomeday);
