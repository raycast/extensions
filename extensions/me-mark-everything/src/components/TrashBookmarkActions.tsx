import { getShortcuts } from "../shortcut-settings";
import { Action, Alert, confirmAlert, Icon } from "@raycast/api";
import { getBookmark } from "../helper";
import { requestTrash, type TrashSnapshot } from "../helpers/trash";
import type { Outcome } from "../helpers/submission";
import { useSubmission } from "../hooks/useSubmission";
import { failure } from "../ui";
import { session } from "../session";
import { showOutcome, SubmissionActions } from "./SubmissionActions";

/** Shared by list, detail, editor and empty-list recovery actions. */
export function TrashBookmarkActions(props: {
  id?: string;
  enabled?: boolean;
  snapshot?: TrashSnapshot;
  revalidate?: () => void | Promise<void>;
  onOutcome?: (outcome: Outcome) => Promise<void>;
}) {
  const submission = useSubmission();
  const complete = async (outcome: Outcome) => {
    if (props.onOutcome) return props.onOutcome(outcome);
    await showOutcome(outcome);
    if (outcome.kind === "committed" || outcome.kind === "committed-conflict") {
      try {
        await props.revalidate?.();
      } catch (cause) {
        await showOutcome({
          kind: "committed-read-failed",
          error: cause instanceof Error ? cause : new Error(String(cause)),
        });
      }
    }
  };
  if (submission.error)
    return (
      <Action
        title="Pending Change Needs Attention"
        icon={Icon.ExclamationMark}
        onAction={() => failure(submission.error)}
      />
    );
  if (!submission.ready || submission.busy) return null;
  if (submission.pending)
    return <SubmissionActions controller={submission.controller} session={session} onOutcome={complete} />;
  const id = props.snapshot?.entity.id ?? props.id;
  if (!id || props.enabled === false) return null;
  return (
    <Action
      title="Move to Trash"
      icon={Icon.Trash}
      style={Action.Style.Destructive}
      shortcut={getShortcuts().shortcutTrash}
      onAction={async () => {
        const outcome = await requestTrash(
          submission.controller,
          async () => {
            if (props.snapshot) return props.snapshot;
            const active = await session();
            return { session: active, entity: await getBookmark(active, id) };
          },
          (entity) =>
            confirmAlert({
              title: "Move Bookmark to Trash?",
              message: `${entity.values.title || entity.values.url}\n\nYou can restore it in ME.${props.snapshot ? " Unsaved form changes will be discarded." : ""}`,
              icon: Icon.Trash,
              primaryAction: { title: "Move to Trash", style: Alert.ActionStyle.Destructive },
            }),
        );
        if (outcome) await complete(outcome);
      }}
    />
  );
}
