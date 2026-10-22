import { showToast, Toast, closeMainWindow } from "@raycast/api";
import { requestStop } from "./utils/stop-signal";

// Stateless by design: the command doesn't know whether a conversion is running (tracking that
// across processes is where the bugs were), it just records the request. A run that exists picks
// it up between files; if none exists, the timestamp is inert.
export default async function Command() {
  await requestStop();
  await closeMainWindow().catch(() => {});
  await showToast(
    Toast.Style.Success,
    "Stop requested — a running conversion finishes its current file and skips the rest",
  );
}
