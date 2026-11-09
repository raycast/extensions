import { Action, Alert, confirmAlert, Icon, showToast, Toast } from "@raycast/api";
import { Failure, type Session } from "../helper";
import type { Outcome, SubmissionController } from "../helpers/submission";

export function outcomeText(outcome: Outcome) {
  switch (outcome.kind) {
    case "no-change":
      return { title: "Nothing changed", message: "No command was sent." };
    case "committed":
      return {
        title:
          outcome.entities.length && outcome.entities.every((e) => e.values.life === "trashed")
            ? "Moved to Trash"
            : "Saved locally",
        message: outcome.sync,
      };
    case "committed-conflict":
      return {
        title: "Saved locally; needs review",
        message: "Concurrent changes or structural issues remain. Open the ME manager.",
      };
    case "committed-read-failed":
      return {
        title: "Saved locally; refresh failed",
        message: outcome.error.message + " Check the result to retry reading.",
      };
    case "rejected":
      return { title: "Changes not submitted", message: outcome.error.message };
    case "pending":
      return {
        title: ["readable", "committed", "recovering"].includes(outcome.phase)
          ? "Saved operation; checking result"
          : "Save result needs checking",
        message: outcome.error.message,
      };
  }
}
export async function showOutcome(outcome: Outcome) {
  await showToast({
    style:
      outcome.kind === "committed" || outcome.kind === "no-change"
        ? Toast.Style.Success
        : Toast.Style.Failure,
    ...outcomeText(outcome),
  });
}
export function SubmissionActions(props: {
  controller: SubmissionController;
  session: () => Promise<Session>;
  onOutcome: (outcome: Outcome) => Promise<void>;
}) {
  return (
    <>
      <Action
        title="Check Result"
        icon={Icon.ArrowClockwise}
        onAction={async () => {
          try {
            await props.onOutcome(
              await props.controller.recover(await props.session(), async () => {
                const retry = await confirmAlert({
                  title: "Retry Original Submission?",
                  message:
                    "ME has no record of this command. Retry exactly the saved input? Newer changes, including a move to Trash, may remain as conflicts for review in ME.",
                  primaryAction: { title: "Retry Original Submission", style: Alert.ActionStyle.Default },
                });
                if (!retry) throw new Failure("CANCELLED", "Original submission kept. Nothing retried.");
              }),
            );
          } catch (e) {
            await showToast({
              style: Toast.Style.Failure,
              title: "Cannot check result",
              message: String(e),
            });
          }
        }}
      />
    </>
  );
}
