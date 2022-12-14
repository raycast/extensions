import {
  CloudWatchLogsClient,
  DescribeLogStreamsCommand,
  FilteredLogEvent,
  FilterLogEventsCommand,
  LogStream,
} from "@aws-sdk/client-cloudwatch-logs";
import { AWS_URL_BASE } from "../constants";

const cloudWatchLogsClient = new CloudWatchLogsClient({});
export async function fetchLogs(
  logGroupName: string,
  logStreamNamePrefix?: string,
  logStreamNames?: string[]
): Promise<FilteredLogEvent[]> {
  if (!process.env.AWS_PROFILE) return [];
  return await fetchAllLogs(logGroupName, logStreamNamePrefix, logStreamNames);
}

export async function fetchLogStreams(logGroupName: string): Promise<LogStream[]> {
  if (!process.env.AWS_PROFILE) return [];
  return await fetchAllLogStreams(logGroupName);
}

async function fetchAllLogStreams(logGroupName: string, token?: string, accEvents?: LogStream[]): Promise<LogStream[]> {
  const { logStreams, nextToken } = await cloudWatchLogsClient.send(
    new DescribeLogStreamsCommand({ logGroupName, nextToken: token })
  );

  const combinedEvents = [...(accEvents || []), ...(logStreams || [])];

  if (nextToken) {
    return fetchAllLogStreams(logGroupName, nextToken, combinedEvents);
  }

  return combinedEvents;
}

async function fetchAllLogs(
  logGroupName: string,
  logStreamNamePrefix?: string,
  logStreamNames?: string[],
  token?: string,
  accEvents?: FilteredLogEvent[]
): Promise<FilteredLogEvent[]> {
  const { events, nextToken } = await cloudWatchLogsClient.send(
    new FilterLogEventsCommand({ logGroupName, logStreamNamePrefix, logStreamNames, nextToken: token })
  );
  const combinedEvents = [...(accEvents || []), ...(events || [])];

  if (nextToken) {
    return fetchAllLogs(logGroupName, logStreamNamePrefix, logStreamNames, nextToken, combinedEvents);
  }

  return combinedEvents;
}

export function getTaskCWLogsGroupUrl(logGroupName: string) {
  return `${AWS_URL_BASE}/cloudwatch/home?region=${process.env.AWS_REGION}#logsV2:log-groups/log-group/${logGroupName}`;
}
