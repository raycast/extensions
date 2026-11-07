import { Action, Icon } from "@raycast/api";
import { FEEDBACK_URL } from "../lib/feedback";

export function FeedbackAction() {
  return <Action.OpenInBrowser title="Report an Issue or Share an Idea" icon={Icon.Bug} url={FEEDBACK_URL} />;
}
