import { ActivityStart } from "./commands/activities/components/ActivityStart";
import { finishMenuBarForm } from "./utils/refresh";

// Start form from Raycast search: choose project and task, then start a timer or log hours.
export default function Command() {
  return <ActivityStart onSubmitted={finishMenuBarForm} />;
}
