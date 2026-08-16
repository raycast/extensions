import type { ReactElement } from "react";

import { bootstrapTickTickCommandRuntime, resolveUiTimeZone } from "./bootstrap/commandBootstrap";
import { SEARCH_COMMAND } from "./commands/taskCommandConfigs";
import TaskListCommandShell from "./commands/taskListCommandShell";

export default function SearchTasksCommand(): ReactElement {
  return (
    <TaskListCommandShell
      bootstrap={bootstrapTickTickCommandRuntime}
      contextKey="ticktick.command.search"
      config={SEARCH_COMMAND}
      options={{ uiTimeZone: resolveUiTimeZone(), exactLinkStrategy: "native-project-uri" }}
    />
  );
}
