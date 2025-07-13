import { WorkflowList } from "./components/WorkflowList";
import { useNavigation, showToast, Toast } from "@raycast/api";
import { SavedWorkflow } from "./types";
import { useUserInfo } from "./hooks/useUserInfo";
import { fetchWorkflowErrors } from "./services/api";

// Import the WorkflowAnalyticsView component
import { WorkflowAnalyticsView } from "./workflow-analytics";

export default function ManageWorkflows() {
  const { push } = useNavigation();
  const { orgId } = useUserInfo();

  const handleViewDetails = async (workflow: SavedWorkflow) => {
    if (!orgId) return;

    try {
      const errorHistory = await fetchWorkflowErrors(workflow.id, orgId);

      push(<WorkflowAnalyticsView workflow={workflow} errors={errorHistory.data} />);
    } catch (error) {
      showToast({
        title: "Error",
        message: `Failed to load analytics: ${error instanceof Error ? error.message : String(error)}`,
        style: Toast.Style.Failure,
      });
    }
  };

  return <WorkflowList showViewDetails={true} onViewDetailsHandler={handleViewDetails} />;
}
