import { environment } from "@raycast/api";
import { ActivityStart } from "./commands/activities/components/ActivityStart";
import { Task } from "./commands/tasks/types";
import { finishMenuBarForm } from "./utils/refresh";

// Opened from the menu bar via launchCommand with { task } as context, or directly from Raycast search.
export default function Command() {
  const task = environment.launchContext?.task as Task | undefined;
  return <ActivityStart task={task} onSubmitted={finishMenuBarForm} />;
}
