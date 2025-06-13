import { ActionPanel } from "@raycast/api";
import { PushBranch } from "../actions/PushBranch.js";
import { PullBranch } from "../actions/PullBranch.js";
import { FetchBranch } from "../actions/FetchBranch.js";

interface Props {
  checkStatus: () => void;
}

export function RemoteGitActions({ checkStatus }: Props) {
  return (
    <ActionPanel.Section title="Remote">
      <PushBranch checkStatus={checkStatus} />
      <PullBranch checkStatus={checkStatus} />
      <FetchBranch checkStatus={checkStatus} />
    </ActionPanel.Section>
  );
}
