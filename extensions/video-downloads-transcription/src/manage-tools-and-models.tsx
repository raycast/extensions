import { preferences } from "./preferences";
import { SetupList } from "./setup-list";

export { runQueueWorker } from "./jobs";

export default function Command() {
  return <SetupList settings={preferences()} />;
}
