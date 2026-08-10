import {
  CloudWatchLogsClient,
  DescribeLogStreamsCommand,
  FilteredLogEvent,
  FilterLogEventsCommand,
  LogStream,
} from "@aws-sdk/client-cloudwatch-logs";
import { LogStartTimes } from "../interfaces";
import { isReadyToFetch } from "../util";

const cloudWatchLogsClient = new CloudWatchLogsClient({});
export async function fetchLogs(
  logGroupName: string,
  startTime: LogStartTimes,
  logStreamNamePrefix?: string,
  logStreamNames?: string[],
): Promise<FilteredLogEvent[]> {
  if (!isReadyToFetch()) return [];
  return await fetchAllLogs(logGroupName, startTime, logStreamNamePrefix, logStreamNames);
}

export async function fetchLogStreams(
  logGroupName: string,
  token?: string,
  accEvents?: LogStream[],
): Promise<LogStream[]> {
  if (!isReadyToFetch()) return [];
  const { logStreams, nextToken } = await cloudWatchLogsClient.send(
    new DescribeLogStreamsCommand({ logGroupName, nextToken: token }),
  );

  const combinedEvents = [...(accEvents || []), ...(logStreams || [])];

  if (combinedEvents.length > 300) {
    return combinedEvents;
  }

  if (nextToken) {
    return fetchLogStreams(logGroupName, nextToken, combinedEvents);
  }

  return combinedEvents;
}

async function fetchAllLogs(
  logGroupName: string,
  startTime: LogStartTimes,
  logStreamNamePrefix?: string,
  logStreamNames?: string[],
  token?: string,
  accEvents?: FilteredLogEvent[],
): Promise<FilteredLogEvent[]> {
  const secondsSinceEpoch = getMiliSecondsSinceEpoch(startTime);

  const { events, nextToken } = await cloudWatchLogsClient.send(
    new FilterLogEventsCommand({
      logGroupName,
      logStreamNamePrefix,
      logStreamNames,
      nextToken: token,
      startTime: secondsSinceEpoch,
    }),
  );
  const combinedEvents = [...(accEvents || []), ...(events || [])];

  if (nextToken) {
    return fetchAllLogs(logGroupName, startTime, logStreamNamePrefix, logStreamNames, nextToken, combinedEvents);
  }

  return combinedEvents;
}

const getMiliSecondsSinceEpoch = (defaultLogsStartTime: LogStartTimes) => {
  let milisecondsSinceEpoch = Date.now();

  switch (defaultLogsStartTime) {
    case "5m":
      milisecondsSinceEpoch -= 300;
      break;
    case "1H":
      milisecondsSinceEpoch -= 3600;
      break;
    case "6H":
      milisecondsSinceEpoch -= 21600;
      break;
    case "12H":
      milisecondsSinceEpoch -= 43200;
      break;
    case "1D":
      milisecondsSinceEpoch -= 86400;
      break;
    case "3D":
      milisecondsSinceEpoch -= 259200;
      break;
    default:
      milisecondsSinceEpoch -= 300;
  }
  return milisecondsSinceEpoch;
};
