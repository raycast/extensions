import {
  Action,
  Alert,
  confirmAlert,
  Icon,
  showToast,
  Toast,
} from "@raycast/api";
import { ENABLE_AUTO_MERGE, MERGE_PULL_REQUEST } from "../github/queries";
import { PullRequest } from "../github/types";
import { mergeReadiness } from "../lib/mergeReadiness";
import { runMutation } from "../github/runMutation";
import { DisableAutoMergeAction } from "./DisableAutoMergeAction";

interface Props {
  pr: PullRequest;
  onRefresh: () => void;
}

export function MergeAction({ pr, onRefresh }: Props) {
  if (pr.state !== "OPEN" || pr.isDraft) {
    return null;
  }

  const label = `${pr.repo}#${pr.number}`;

  async function handleMerge() {
    const readiness = mergeReadiness(pr.mergeStateStatus);

    if (readiness.kind === "confirm") {
      const confirmed = await confirmAlert({
        title: "Merge anyway?",
        message: readiness.reason,
        primaryAction: { title: "Merge", style: Alert.ActionStyle.Destructive },
      });
      if (!confirmed) return;
    }

    if (readiness.kind === "blocked") {
      if (!readiness.autoMergeable) {
        await showToast({
          style: Toast.Style.Failure,
          title: "Cannot merge",
          message: readiness.reason,
        });
        return;
      }
      const enable = await confirmAlert({
        title: "Not mergeable yet",
        message: `${readiness.reason}\n\nEnable auto-merge so GitHub merges it once everything passes?`,
        primaryAction: { title: "Enable Auto-Merge" },
      });
      if (enable) {
        await runMutation(
          "Enabling auto-merge…",
          `Auto-merge enabled on ${label}`,
          ENABLE_AUTO_MERGE,
          { prId: pr.id, method: pr.defaultMergeMethod },
          onRefresh,
        );
      }
      return;
    }

    await runMutation(
      "Merging…",
      `Merged ${label}`,
      MERGE_PULL_REQUEST,
      { prId: pr.id, method: pr.defaultMergeMethod },
      onRefresh,
    );
  }

  return (
    <>
      <Action
        title="Merge"
        icon={Icon.ArrowDownCircle}
        shortcut={{ modifiers: ["cmd"], key: "m" }}
        onAction={handleMerge}
      />
      <DisableAutoMergeAction pr={pr} onRefresh={onRefresh} />
    </>
  );
}
