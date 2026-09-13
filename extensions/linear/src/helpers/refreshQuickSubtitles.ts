import { launchCommand, LaunchType } from "@raycast/api";

// updateCommandMetadata only updates the CURRENT command, so subtitle freshness after a
// workspace change requires each quick command to briefly run itself: a background
// launch with refreshSubtitle context makes it update its subtitle and exit. Failures
// are swallowed — subtitle freshness is cosmetic and background launches can be
// unavailable (e.g. command disabled).
const QUICK_COMMANDS: Array<{ name: string; arguments: Record<string, string> }> = [
  { name: "create-issue-for-myself", arguments: { title: "" } },
  { name: "create-issue-for-myself-in-workspace", arguments: { workspace: "", title: "" } },
  { name: "quick-add-comment-to-issue", arguments: { comment: "", issueId: "" } },
];

export function refreshQuickCommandSubtitles(): void {
  for (const { name, arguments: args } of QUICK_COMMANDS) {
    launchCommand({ name, type: LaunchType.Background, arguments: args, context: { refreshSubtitle: true } }).catch(
      () => {},
    );
  }
}
