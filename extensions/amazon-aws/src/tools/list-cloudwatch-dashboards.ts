import { DashboardEntry, ListDashboardsCommand } from "@aws-sdk/client-cloudwatch";
import { getCloudWatchClient } from "../services/clients/cloudwatch";

/**
 * Lists CloudWatch dashboards in the current AWS account and region (max 500)
 * @returns Promise<DashboardEntry[]> Array of CloudWatch dashboards
 */
export default async function listCloudWatchDashboards(): Promise<DashboardEntry[]> {
  const client = getCloudWatchClient();

  const dashboards: DashboardEntry[] = [];
  let nextToken: string | undefined;

  do {
    const command = new ListDashboardsCommand({ NextToken: nextToken });
    const response = await client.send(command);

    if (response.DashboardEntries) {
      dashboards.push(...response.DashboardEntries.filter((d) => d.DashboardName && d.DashboardArn));
    }

    nextToken = response.NextToken;
  } while (nextToken && dashboards.length < 500);

  return dashboards;
}
