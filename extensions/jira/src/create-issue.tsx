import CreateIssueForm from "./components/CreateIssueForm";
import { withJiraCredentialsComponent } from "./helpers/withJiraCredentials";

export default withJiraCredentialsComponent(CreateIssueForm);
