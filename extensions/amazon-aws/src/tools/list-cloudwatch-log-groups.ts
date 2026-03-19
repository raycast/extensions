import { LogGroup, DescribeLogGroupsCommand } from "@aws-sdk/client-cloudwatch-logs";
import { getCloudWatchLogsClient } from "../services/clients/cloudwatch-logs";

/**
 * Lists CloudWatch log groups in the current AWS account and region (max 500)
 * @returns Promise<LogGroup[]> Array of CloudWatch log groups
 */
export default async function listCloudWatchLogGroups(): Promise<LogGroup[]> {
  const client = getCloudWatchLogsClient();

  const logGroups: LogGroup[] = [];
  let nextToken: string | undefined;

  do {
    const command = new DescribeLogGroupsCommand({ limit: 50, nextToken });
    const response = await client.send(command);

    if (response.logGroups) {
      logGroups.push(...response.logGroups.filter((g) => g.logGroupArn && g.logGroupName && g.creationTime));
    }

    nextToken = response.nextToken;
  } while (nextToken && logGroups.length < 500);

  return logGroups;
}
