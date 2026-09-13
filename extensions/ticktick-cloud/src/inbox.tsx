import type { ReactElement } from "react";

import { bootstrapTickTickCommandRuntime, resolveUiTimeZone } from "./bootstrap/commandBootstrap";
import { INBOX_COMMAND } from "./commands/taskCommandConfigs";
import TaskListCommandShell from "./commands/taskListCommandShell";

export default function InboxCommand(): ReactElement {
  return (
    <TaskListCommandShell
      bootstrap={bootstrapTickTickCommandRuntime}
      contextKey="ticktick.command.inbox"
      config={INBOX_COMMAND}
      options={{ uiTimeZone: resolveUiTimeZone(), exactLinkStrategy: "native-project-uri" }}
    />
  );
}
