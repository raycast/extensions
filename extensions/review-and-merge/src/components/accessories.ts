import { Color, Icon, Image, List } from "@raycast/api";
import { PullRequest } from "../github/types";
import { Reviewer, ReviewerStatus } from "../lib/reviewers";

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

const REVIEWER_STATUS_ICON: Record<ReviewerStatus, Image.ImageLike> = {
  changes_requested: { source: Icon.Pencil, tintColor: Color.Orange },
  pending: { source: Icon.Clock, tintColor: Color.Yellow },
  approved: { source: Icon.CheckCircle, tintColor: Color.Green },
  commented: { source: Icon.Bubble, tintColor: Color.SecondaryText },
};

const REVIEWER_STATUS_LABEL: Record<ReviewerStatus, string> = {
  changes_requested: "Requested changes",
  pending: "Review pending",
  approved: "Approved",
  commented: "Commented",
};

/** Reviewer groups are shown most-actionable first. */
const REVIEWER_STATUS_ORDER: ReviewerStatus[] = [
  "changes_requested",
  "pending",
  "approved",
  "commented",
];

const MAX_REVIEWER_AVATARS = 5;

function reviewerAvatar(reviewer: Reviewer): Image.ImageLike {
  if (reviewer.type === "team") {
    return { source: Icon.TwoPeople, tintColor: Color.SecondaryText };
  }
  return reviewer.avatarUrl
    ? { source: reviewer.avatarUrl, mask: Image.Mask.Circle }
    : { source: Icon.Person };
}

/**
 * Requested + submitted reviewers as avatars, grouped by status behind a tinted
 * marker (✎ changes, ⏳ pending, ✓ approved, 💬 commented). Falls back to the
 * overall review-decision icon when there are no individual reviewers.
 */
export function reviewersAccessories(pr: PullRequest): List.Item.Accessory[] {
  // `reviewers` may be missing on data restored from an older cache (it predates
  // this field), so tolerate undefined instead of crashing the first render.
  const reviewers = pr.reviewers ?? [];
  if (reviewers.length === 0) {
    return reviewDecisionAccessories(pr);
  }

  const accessories: List.Item.Accessory[] = [];
  let shown = 0;
  let overflow = 0;

  for (const status of REVIEWER_STATUS_ORDER) {
    const group = reviewers.filter((reviewer) => reviewer.status === status);
    if (group.length === 0) continue;

    const visible = group.slice(0, Math.max(0, MAX_REVIEWER_AVATARS - shown));
    overflow += group.length - visible.length;
    if (visible.length === 0) continue;
    shown += visible.length;

    accessories.push({
      icon: REVIEWER_STATUS_ICON[status],
      tooltip: REVIEWER_STATUS_LABEL[status],
    });
    for (const reviewer of visible) {
      accessories.push({
        icon: reviewerAvatar(reviewer),
        tooltip: `${reviewer.login} — ${REVIEWER_STATUS_LABEL[status]}`,
      });
    }
  }

  if (overflow > 0) {
    accessories.push({
      text: `+${overflow}`,
      tooltip: `${overflow} more reviewer${overflow === 1 ? "" : "s"}`,
    });
  }

  return accessories;
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
