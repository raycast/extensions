import { showHUD } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import { EchoError, fetchLastPlayed, resumeItem } from "./echo";

export default async function ResumeLast() {
  try {
    const latest = await fetchLastPlayed();
    if (!latest) {
      await showHUD("Echo has nothing to resume yet");
      return;
    }
    await resumeItem(latest.id, "auto");
    await showHUD(`Resuming ${latest.title}`);
  } catch (e) {
    await showFailureToast(e, { title: e instanceof EchoError ? e.message : "Could not reach Echo" });
  }
}
