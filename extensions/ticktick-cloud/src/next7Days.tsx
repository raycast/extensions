import type { ReactElement } from "react";

import { bootstrapTickTickCommandRuntime, resolveUiTimeZone } from "./bootstrap/commandBootstrap";
import { NEXT_SEVEN_COMMAND } from "./commands/taskCommandConfigs";
import TaskListCommandShell from "./commands/taskListCommandShell";

export default function Next7DaysCommand(): ReactElement {
  return (
    <TaskListCommandShell
      bootstrap={bootstrapTickTickCommandRuntime}
      contextKey="ticktick.command.next7Days"
      config={NEXT_SEVEN_COMMAND}
      options={{ uiTimeZone: resolveUiTimeZone(), exactLinkStrategy: "native-project-uri" }}
    />
  );
}
