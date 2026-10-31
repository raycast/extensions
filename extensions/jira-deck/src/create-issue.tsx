import { LaunchProps } from "@raycast/api";
import { CreateIssueForm, Values } from "./components/create-issue-form";

export default function Command({
  arguments: { summary },
  draftValues,
  fallbackText,
}: LaunchProps<{ arguments: Arguments.CreateIssue; draftValues: Values }>) {
  // Typed as the argument in root search, or as the text a fallback command was opened with.
  return <CreateIssueForm draftValues={draftValues} summary={summary?.trim() || fallbackText?.trim() || undefined} />;
}
