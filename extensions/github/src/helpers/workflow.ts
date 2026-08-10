import { Color, Icon, List } from "@raycast/api";
import { differenceInSeconds } from "date-fns";

import { WorkflowRun } from "../components/WorkflowRunListItem";

type Status = "queued" | "in_progress" | "completed";

type Conclusion =
  | "success"
  | "failure"
  | "neutral"
  | "cancelled"
  | "skipped"
  | "timed_out"
  | "action_required"
  | "startup_failure";

export function getWorkflowStatus(workflow_run: WorkflowRun): List.Item.Props["icon"] {
  const status = workflow_run.status as Status;
  const conclusion = workflow_run.conclusion as Conclusion;

  switch (status) {
    case "queued":
      return { value: { source: Icon.Circle, tintColor: Color.Yellow }, tooltip: `Status: In Queue` };
    case "in_progress":
      return { value: { source: Icon.Circle, tintColor: Color.Yellow }, tooltip: `Status: In Progress` };
    case "completed":
      switch (conclusion) {
        case "success":
          return {
            value: { source: Icon.CheckCircle, tintColor: Color.Green },
            tooltip: `Status: Completed in ${differenceInSeconds(
              new Date(workflow_run.updated_at),
              new Date(workflow_run.created_at),
            )}s`,
          };
        case "failure":
        case "startup_failure":
          return {
            value: { source: Icon.XMarkCircle, tintColor: Color.Red },
            tooltip: `Status: Failure`,
          };
        case "neutral":
          return {
            value: { source: Icon.Circle, tintColor: Color.SecondaryText },
            tooltip: `Status: Neutral`,
          };
        case "cancelled":
          return {
            value: { source: Icon.MinusCircle, tintColor: Color.SecondaryText },
            tooltip: `Status: Cancelled`,
          };
        case "skipped":
          return {
            value: { source: Icon.Circle, tintColor: Color.SecondaryText },
            tooltip: `Status: Skipped`,
          };
        case "timed_out":
          return {
            value: { source: Icon.Circle, tintColor: Color.SecondaryText },
            tooltip: `Status: Timed Out`,
          };
        case "action_required":
          return {
            value: { source: Icon.Circle, tintColor: Color.SecondaryText },
            tooltip: `Status: Action Required`,
          };
        default:
          return { source: Icon.QuestionMark, tooltip: `Status: Unknown` };
      }
    default:
      return { source: Icon.QuestionMark, tooltip: `Status: Unknown` };
  }
}
