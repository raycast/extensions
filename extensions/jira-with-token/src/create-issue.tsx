import { LaunchProps } from "@raycast/api";

import CreateIssueForm, { IssueFormValues } from "./components/CreateIssueForm";
import { withJiraCredentials } from "./helpers/withJiraCredentials";

export default function Command(props: LaunchProps<{ draftValues: IssueFormValues }>) {
  return withJiraCredentials(<CreateIssueForm draftValues={props.draftValues} />);
}
