import type { ReactElement } from "react";

import { bootstrapTickTickCommandRuntime, resolveUiTimeZone } from "./bootstrap/commandBootstrap";
import { TODAY_COMMAND } from "./commands/taskCommandConfigs";
import TaskListCommandShell from "./commands/taskListCommandShell";

export default function TodayCommand(): ReactElement {
  return (
    <TaskListCommandShell
      bootstrap={bootstrapTickTickCommandRuntime}
      contextKey="ticktick.command.today"
      config={TODAY_COMMAND}
      options={{ uiTimeZone: resolveUiTimeZone(), exactLinkStrategy: "native-project-uri" }}
    />
  );
}
