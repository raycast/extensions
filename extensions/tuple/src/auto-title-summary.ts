import { LaunchProps, showHUD, showToast, Toast } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import { aiAvailable, generateCallMetadata } from "./lib/ai";
import { listRecordedCalls, setCallSummary, setCallTitle } from "./lib/tuple";

/** Optional `{ "callId": "..." }` passed via deeplink `context=` for automation; absent for a hotkey run. */
interface LaunchContext {
  callId?: string;
}

/**
 * Headless counterpart to the "Generate Title & Summary…" action: drafts both from the transcript and
 * writes them straight to the call, skipping the editable form. Targets the call id from the launch
 * context (deeplink automation) or, by default, the most recently recorded call. Hotkey- and
 * deeplink-friendly; requires Raycast Pro for the AI call.
 */
export default async function AutoTitleSummary(props: LaunchProps<{ launchContext?: LaunchContext }>) {
  if (!aiAvailable()) {
    await showFailureToast(new Error("Generating with AI requires Raycast Pro."), { title: "Raycast Pro Required" });
    return;
  }

  let callId: string | undefined;
  try {
    callId = props.launchContext?.callId?.trim() || (await mostRecentCallId());
  } catch (error) {
    await showFailureToast(error, { title: "Could Not Load Calls" });
    return;
  }

  if (!callId) {
    await showFailureToast(new Error("No recorded calls were found to summarize."), { title: "Nothing to Summarize" });
    return;
  }

  const toast = await showToast({ style: Toast.Style.Animated, title: "Generating title & summary…" });
  try {
    const { title, summary, parsed } = await generateCallMetadata(callId);
    const newTitle = title.trim();
    const newSummary = summary.trim();
    // With no review step, only write a cleanly parsed result. A non-JSON reply (parsed: false) holds
    // the raw model text — writing that as a summary, or blanking an existing title, would be worse
    // than doing nothing. Use the editable "Generate Title & Summary" command for those cases.
    if (!parsed || (!newTitle && !newSummary)) {
      toast.style = Toast.Style.Failure;
      toast.title = "Could Not Generate";
      toast.message = "The model didn’t return a usable title or summary. Try the editable version.";
      return;
    }
    if (newTitle) {
      await setCallTitle(callId, newTitle);
    }
    if (newSummary) {
      await setCallSummary(callId, newSummary);
    }
    await toast.hide();
    await showHUD(`Updated “${newTitle || "call"}”`);
  } catch (error) {
    toast.style = Toast.Style.Failure;
    toast.title = "Could Not Generate";
    toast.message = error instanceof Error ? error.message : String(error);
  }
}

/** The most recently started recorded call, or undefined when nothing has been recorded. */
async function mostRecentCallId(): Promise<string | undefined> {
  const calls = await listRecordedCalls();
  if (calls.length === 0) {
    return undefined;
  }
  // The CLI returns calls most-recent-first; prefer the latest started_at, falling back to that order
  // so a missing or all-equal started_at still yields a real call instead of nothing.
  const latest = calls.reduce((best, call) => (call.started_at > best.started_at ? call : best), calls[0]);
  return latest.call_id;
}
