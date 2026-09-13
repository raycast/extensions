import type { ReactElement } from "react";

import { bootstrapTickTickCommandRuntime } from "./bootstrap/commandBootstrap";
import { CreateTaskCommandShell } from "./commands/createTaskCommandShell";
import { loadRaycastCreateFormDefaults } from "./platform/RaycastCreationDefaults";
import { raycastTaskDestinationPreferences } from "./platform/RaycastTaskDestinationPreferences";

export default function CreateTaskEntry(): ReactElement {
  return (
    <CreateTaskCommandShell
      bootstrap={bootstrapTickTickCommandRuntime}
      contextKey="ticktick.command.create"
      dependencies={{
        preferences: raycastTaskDestinationPreferences,
        loadDefaults: loadRaycastCreateFormDefaults,
        fieldAvailability: {},
      }}
    />
  );
}
