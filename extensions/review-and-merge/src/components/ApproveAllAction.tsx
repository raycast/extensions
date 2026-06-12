import {
  Action,
  Alert,
  confirmAlert,
  Icon,
  showToast,
  Toast,
} from "@raycast/api";
import { setTimeout as sleep } from "timers/promises";
import { githubGraphql } from "../github/client";
import { APPROVE_PULL_REQUEST } from "../github/queries";
import { PullRequest } from "../github/types";
import { canApprove } from "../lib/canApprove";
import { shortRepoName } from "../lib/groupByRepo";

interface Props {
  repo: string;
  pullRequests: PullRequest[];
  viewerLogin: string | undefined;
  onRefresh: () => void;
}

export function ApproveAllAction({
  repo,
  pullRequests,
  viewerLogin,
  onRefresh,
}: Props) {
  const targets = pullRequests.filter((pr) => canApprove(pr, viewerLogin));
  if (targets.length < 2) {
    return null;
  }

  const repoName = shortRepoName(repo);

  async function approveAll() {
    const confirmed = await confirmAlert({
      title: `Approve ${targets.length} PRs in ${repoName}?`,
      message:
        "Submits an APPROVE review on each. This can't be undone in bulk.",
      primaryAction: {
        title: "Approve All",
        style: Alert.ActionStyle.Destructive,
      },
    });
    if (!confirmed) {
      return;
    }

    const toast = await showToast({
      style: Toast.Style.Animated,
      title: `Approving 0/${targets.length}…`,
    });
    let approved = 0;
    const failed: string[] = [];
    for (const pr of targets) {
      try {
        await githubGraphql(APPROVE_PULL_REQUEST, { prId: pr.id });
        approved += 1;
        toast.title = `Approving ${approved}/${targets.length}…`;
      } catch {
        failed.push(`#${pr.number}`);
      }
      await sleep(250);
    }

    if (failed.length === 0) {
      toast.style = Toast.Style.Success;
      toast.title = `Approved ${approved} PRs in ${repoName}`;
    } else {
      toast.style = Toast.Style.Failure;
      toast.title = `Approved ${approved}, ${failed.length} failed`;
      toast.message = `Failed: ${failed.join(", ")}`;
    }
    onRefresh();
  }

  return (
    <Action
      title={`Approve All in ${repoName} (${targets.length})`}
      icon={Icon.CheckCircle}
      onAction={approveAll}
    />
  );
}
