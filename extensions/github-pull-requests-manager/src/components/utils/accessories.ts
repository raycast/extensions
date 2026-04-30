import { List, Icon, Color } from "@raycast/api";
import { PullRequest } from "../../github/types/pr";
import { MyReviewActivity } from "../../github/types/reviews";
import { PRExtraInfo } from "../../github/types/ci";
import { getCIDotColor } from "./ci";

export function getListAccessories(
  pr: PullRequest,
  extraInfo: PRExtraInfo | undefined,
  isMyPR: boolean,
  myActivity?: MyReviewActivity,
): List.Item.Accessory[] {
  const accessories: List.Item.Accessory[] = [];

  if (myActivity && (myActivity.hasCommented || myActivity.hasRequestedChanges)) {
    accessories.push({
      icon: {
        source: Icon.Bubble,
        tintColor: myActivity.hasReplies ? Color.Orange : Color.SecondaryText,
      },
      tooltip: myActivity.hasReplies ? "Someone replied to your comment" : "You commented on this PR",
    });
  }

  if (pr.draft) {
    accessories.push({ tag: { value: "Draft", color: Color.SecondaryText } });
  }

  if (isMyPR && extraInfo?.mergeableState) {
    if (extraInfo.mergeableState === "behind") {
      accessories.push({
        icon: { source: Icon.ArrowClockwise, tintColor: Color.Orange },
        tooltip: "Needs rebase — branch is behind base",
      });
    } else if (extraInfo.mergeableState === "dirty") {
      accessories.push({
        icon: { source: Icon.Warning, tintColor: Color.Red },
        tooltip: "Merge conflicts",
      });
    }
  }

  if (extraInfo?.reviewCounts) {
    if (extraInfo.reviewCounts.approved > 0) {
      accessories.push({
        icon: { source: Icon.Checkmark, tintColor: Color.Green },
        text: String(extraInfo.reviewCounts.approved),
        tooltip: `${extraInfo.reviewCounts.approved} approval${extraInfo.reviewCounts.approved > 1 ? "s" : ""}`,
      });
    }
    if (extraInfo.reviewCounts.changesRequested > 0) {
      accessories.push({
        icon: { source: Icon.XMarkCircle, tintColor: Color.Red },
        text: String(extraInfo.reviewCounts.changesRequested),
        tooltip: `${extraInfo.reviewCounts.changesRequested} change${extraInfo.reviewCounts.changesRequested > 1 ? "s" : ""} requested`,
      });
    }
  }

  if (pr.comments > 0) {
    accessories.push({
      icon: Icon.Bubble,
      text: String(pr.comments),
      tooltip: `${pr.comments} comment${pr.comments > 1 ? "s" : ""}`,
    });
  }

  accessories.push({
    date: new Date(pr.updated_at),
    tooltip: `Updated ${new Date(pr.updated_at).toLocaleString()}`,
  });

  if (extraInfo?.ci && extraInfo.ci.status !== "unknown") {
    const { status, failing, total } = extraInfo.ci;
    const tooltip =
      status === "failure"
        ? `${failing} failed / ${total} total`
        : status === "pending"
          ? `${extraInfo.ci.pending} running / ${total} total`
          : `${total} / ${total} passed`;
    accessories.push({
      icon: { source: Icon.CircleFilled, tintColor: getCIDotColor(status) },
      tooltip,
    });
  }

  return accessories;
}
