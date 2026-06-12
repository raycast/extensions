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

export function pullRequestStateIcon(pr: PullRequest): Image.ImageLike {
  if (pr.isDraft) {
    return { source: Icon.CircleEllipsis, tintColor: Color.SecondaryText };
  }
  switch (pr.state) {
    case "MERGED":
      return { source: Icon.CheckCircle, tintColor: Color.Purple };
    case "CLOSED":
      return { source: Icon.XMarkCircle, tintColor: Color.Red };
    default:
      return { source: Icon.Circle, tintColor: Color.Green };
  }
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

  if (pr.state === "OPEN" && pr.reviewDecision) {
    const reviews: Record<string, List.Item.Accessory> = {
      APPROVED: { tag: { value: "Approved", color: Color.Green } },
      CHANGES_REQUESTED: {
        tag: { value: "Changes requested", color: Color.Red },
      },
      REVIEW_REQUIRED: {
        tag: { value: "Review required", color: Color.Orange },
      },
    };
    accessories.push(reviews[pr.reviewDecision]);
  }

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
