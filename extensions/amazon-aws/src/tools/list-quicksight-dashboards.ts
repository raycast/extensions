import { DashboardSummary, ListDashboardsCommand } from "@aws-sdk/client-quicksight";
import { getAwsAccountId } from "../hooks/use-quicksight";
import { getQuickSightClient } from "../services/clients/quicksight";

/**
 * Lists all QuickSight dashboards in the current AWS account
 * @returns Array of QuickSight dashboard summaries
 */
export default async function listQuickSightDashboards(): Promise<DashboardSummary[]> {
  const accountId = await getAwsAccountId();
  const client = getQuickSightClient();

  const command = new ListDashboardsCommand({
    AwsAccountId: accountId,
  });
  const response = await client.send(command);

  return response.DashboardSummaryList ?? [];
}
