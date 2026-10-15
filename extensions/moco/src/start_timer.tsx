import { ActivityStart } from "./commands/activities/components/ActivityStart";
import { finishMenuBarForm } from "./utils/refresh";

// Start form from Raycast search or the menu bar ("Add Activity…"): start a timer or log hours.
export default function Command() {
  return <ActivityStart onSubmitted={finishMenuBarForm} />;
}
