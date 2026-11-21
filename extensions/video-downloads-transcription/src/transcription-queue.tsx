import { preferences } from "./preferences";
import { QueueList, jobToast } from "./queue";

export { runQueueWorker } from "./jobs";

export default function Command() {
  return (
    <QueueList settings={preferences()} onFinish={(job) => jobToast(job)} />
  );
}
