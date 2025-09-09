import { ActionPanel } from "@raycast/api";
import { PushBranch } from "../actions/PushBranch.js";
import { PullBranch } from "../actions/PullBranch.js";
import { FetchBranch } from "../actions/FetchBranch.js";

export function RemoteGitActions() {
  return (
    <ActionPanel.Section title="Remote">
      <PushBranch />
      <PullBranch />
      <FetchBranch />
    </ActionPanel.Section>
  );
}
