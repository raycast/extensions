import CreateIssueForm from "./components/CreateIssueForm";
import { withJiraCredentials } from "./helpers/withJiraCredentials";

export default withJiraCredentials(CreateIssueForm);
