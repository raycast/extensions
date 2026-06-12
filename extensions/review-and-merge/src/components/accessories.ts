import { Color, Icon, Image, List } from "@raycast/api";
import { PullRequest } from "../github/types";

const CHECKS_ACCESSORY: Record<string, List.Item.Accessory> = {
  SUCCESS: {
    icon: { source: Icon.CheckCircle, tintColor: Color.Green },
    tooltip: "Checks passing",
  },
  FAILURE: {
    icon: { source: Icon.XMarkCircle, tintColor: Color.Red },
    tooltip: "Checks failing",
  },
  ERROR: {
    icon: { source: Icon.XMarkCircle, tintColor: Color.Red },
    tooltip: "Checks errored",
  },
  PENDING: {
    icon: { source: Icon.Clock, tintColor: Color.Yellow },
    tooltip: "Checks running",
  },
  EXPECTED: {
    icon: { source: Icon.Clock, tintColor: Color.Yellow },
    tooltip: "Checks expected",
  },
};

interface PullRequestStatus {
  icon: Image.ImageLike;
  text: string;
}

/** The PR's status: a GitHub-style pull-request glyph and its label. */
export function pullRequestStatus(pr: PullRequest): PullRequestStatus {
  if (pr.isDraft) {
    return {
      icon: {
        source: "pull-request-draft.svg",
        tintColor: Color.SecondaryText,
      },
      text: "Draft",
    };
  }
  switch (pr.state) {
    case "MERGED":
      return {
        icon: { source: "pull-request-merged.svg", tintColor: Color.Purple },
        text: "Merged",
      };
    case "CLOSED":
      return {
        icon: { source: "pull-request-closed.svg", tintColor: Color.Red },
        text: "Closed",
      };
    default:
      return {
        icon: { source: "pull-request-open.svg", tintColor: Color.Green },
        text: "Open",
      };
  }
}

/** List.Item leading icon for a PR, including a "Status: …" tooltip. */
export function pullRequestStateIcon(pr: PullRequest): {
  value: Image.ImageLike;
  tooltip: string;
} {
  const status = pullRequestStatus(pr);
  return { value: status.icon, tooltip: `Status: ${status.text}` };
}

const REVIEW_DECISION_ACCESSORY: Record<string, List.Item.Accessory> = {
  APPROVED: {
    icon: { source: Icon.CheckCircle, tintColor: Color.Green },
    tooltip: "Approved",
  },
  CHANGES_REQUESTED: {
    icon: { source: Icon.Pencil, tintColor: Color.Orange },
    tooltip: "Changes requested",
  },
  REVIEW_REQUIRED: {
    icon: { source: Icon.Eye, tintColor: Color.Yellow },
    tooltip: "Review required",
  },
};

/** Review decision shown as a compact tinted icon (open PRs only). */
export function reviewDecisionAccessories(
  pr: PullRequest,
): List.Item.Accessory[] {
  if (pr.state !== "OPEN" || !pr.reviewDecision) {
    return [];
  }
  return [REVIEW_DECISION_ACCESSORY[pr.reviewDecision]];
}

/** Comment count with a speech-bubble icon (dimmed when there are none). */
export function commentsAccessories(pr: PullRequest): List.Item.Accessory[] {
  return [
    {
      icon: Icon.Bubble,
      text: {
        value: `${pr.comments}`,
        color: pr.comments > 0 ? Color.PrimaryText : Color.SecondaryText,
      },
      tooltip: `${pr.comments} ${pr.comments === 1 ? "comment" : "comments"}`,
    },
  ];
}

/** Relative "last updated" date. */
export function dateAccessories(pr: PullRequest): List.Item.Accessory[] {
  return [{ date: new Date(pr.updatedAt), tooltip: "Last updated" }];
}

export function authorAccessory(pr: PullRequest): List.Item.Accessory {
  return {
    icon: pr.authorAvatarUrl
      ? { source: pr.authorAvatarUrl, mask: Image.Mask.Circle }
      : { source: Icon.Person },
    tooltip: pr.authorLogin,
  };
}

export function checksAccessories(pr: PullRequest): List.Item.Accessory[] {
  return pr.checksState ? [CHECKS_ACCESSORY[pr.checksState]] : [];
}

export function autoMergeAccessories(pr: PullRequest): List.Item.Accessory[] {
  return pr.autoMergeEnabled
    ? [
        {
          icon: { source: Icon.Bolt, tintColor: Color.Purple },
          tooltip: "Auto-merge enabled",
        },
      ]
    : [];
}

export function pullRequestAccessories(pr: PullRequest): List.Item.Accessory[] {
  const accessories: List.Item.Accessory[] = [];

  if (pr.autoMergeEnabled) {
    accessories.push({
      icon: { source: Icon.Bolt, tintColor: Color.Purple },
      tooltip: "Auto-merge enabled",
    });
  }

  if (pr.checksState) {
    accessories.push(CHECKS_ACCESSORY[pr.checksState]);
  }

  accessories.push(...reviewDecisionAccessories(pr));

  if (pr.state !== "OPEN") {
    accessories.push(
      pr.state === "MERGED"
        ? { tag: { value: "Merged", color: Color.Purple } }
        : { tag: { value: "Closed", color: Color.Red } },
    );
  }

  accessories.push({ date: new Date(pr.updatedAt), tooltip: "Last updated" });
  return accessories;
}
