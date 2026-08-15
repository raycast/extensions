import { withAccessToken } from "@raycast/utils";

import TaskList from "./components/task-list";
import { oauthService } from "./oauth";

const ShowToday = () => <TaskList view="today" />;

export default withAccessToken(oauthService)(ShowToday);
