import { withAccessToken } from "@raycast/utils";

import TaskList from "./components/task-list";
import { oauthService } from "./oauth";

const ShowAnytime = () => <TaskList view="anytime" />;

export default withAccessToken(oauthService)(ShowAnytime);
