import { Color, Icon } from "@raycast/api";
import { ReviewState } from "./reviewState";

export interface Reviewer {
  nickname: string;
  state: "approved" | "changes_requested";
  uuid?: string;
}

interface RawParticipant {
  state?: string | null;
  user?: { nickname?: string; uuid?: string };
}

// Bitbucket's PR responses already include `participants` by default (no extra
// fields/requests needed) — this just narrows it down to actual reviewers.
// `unknown[]` because the SDK's `Account` type doesn't model `nickname` even
// though the API returns it (same as `author.nickname` elsewhere in this codebase).
export function extractReviewers(participants: unknown[] | undefined | null): Reviewer[] {
  return ((participants as RawParticipant[] | undefined) ?? [])
    .filter((p) => p.state === "approved" || p.state === "changes_requested")
    .map((p) => ({
      nickname: p.user?.nickname ?? "Unknown",
      state: p.state as "approved" | "changes_requested",
      uuid: p.user?.uuid,
    }));
}

// Finds the current viewer's own review state among the real (server-persisted)
// reviewers, matched by account uuid — the identity field that survives restarts,
// unlike the session-local `ReviewState` toggle.
export function findMyReviewState(reviewers: Reviewer[], myUuid: string | null): ReviewState {
  if (!myUuid) {
    return null;
  }
  return reviewers.find((r) => r.uuid === myUuid)?.state ?? null;
}

interface ReviewAccessory {
  icon: { source: Icon; tintColor: Color };
  tooltip: string;
}

// Relabels the viewer's own real reviewer entry (matched by uuid) as "You". If no
// real entry exists yet but `myReviewState` is set, that's the instant-feedback gap
// right after firing an action, before the next refetch would surface it for real —
// synthesize a "You" entry for that case instead.
export function buildReviewAccessories(
  reviewers: Reviewer[],
  myUuid: string | null,
  myReviewState: ReviewState,
): ReviewAccessory[] {
  const labeled = reviewers.map((r) => (myUuid && r.uuid === myUuid ? { ...r, nickname: "You" } : r));
  const hasMe = labeled.some((r) => r.nickname === "You");
  const withMe = !hasMe && myReviewState ? [{ nickname: "You", state: myReviewState }, ...labeled] : labeled;

  const approvedBy = withMe.filter((r) => r.state === "approved").map((r) => r.nickname);
  const changesRequestedBy = withMe.filter((r) => r.state === "changes_requested").map((r) => r.nickname);

  const accessories: ReviewAccessory[] = [];
  if (changesRequestedBy.length > 0) {
    accessories.push({
      icon: { source: Icon.ExclamationMark, tintColor: Color.Orange },
      tooltip: `Changes requested by ${changesRequestedBy.join(", ")}`,
    });
  }
  if (approvedBy.length > 0) {
    accessories.push({
      icon: { source: Icon.CheckCircle, tintColor: Color.Green },
      tooltip: `Approved by ${approvedBy.join(", ")}`,
    });
  }
  return accessories;
}
