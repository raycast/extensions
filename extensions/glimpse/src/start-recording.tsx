import { showHUD } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import { glimpse, RecordStatus } from "./glimpse";
import { refreshMenuBar } from "./recording";

export default async function Command() {
  try {
    // record start launches Glimpse if needed and reuses the last recording's sources.
    await glimpse<RecordStatus>(["record", "start"]);
    await refreshMenuBar();
    await showHUD("Recording started");
  } catch (error) {
    await showFailureToast(error, { title: "Couldn't start recording" });
  }
}
