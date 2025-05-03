import { Color } from "@raycast/api";
import { Status } from "../Domain/ProposalDataModel";

export function mapStatusToRaycastColor(status: Status): Color {
  switch (status) {
    case Status.awaitingReview:
      return Color.Orange;
    case Status.scheduledForReview:
      return Color.Orange;
    case Status.activeReview:
      return Color.Orange;
    case Status.accepted:
      return Color.Green;
    case Status.acceptedWithRevisions:
      return Color.Green;
    case Status.previewing:
      return Color.Green;
    case Status.implemented:
      return Color.Blue;
    case Status.returnedForRevision:
      return Color.Purple;
    case Status.deferred:
      return Color.Red;
    case Status.rejected:
      return Color.Red;
    case Status.withdrawn:
      return Color.Red;
    default:
      return Color.PrimaryText;
  }
}
