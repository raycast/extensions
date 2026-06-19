import { getEnvironmentLogs } from "../api/environments";
import { getTimeRangeFrom } from "../utils/dates";

type Input = {
  /** The ID of the environment whose application logs to retrieve */
  environmentId: string;
  /** Optional search query to filter logs */
  query?: string;
  /** Optional log type filter: "access", "application", "exception", or "system" */
  type?: string;
  /** Optional time range: "15m", "1h", "6h", "24h", or "7d". Defaults to "1h" */
  timeRange?: string;
};

export default async function (input: Input) {
  const response = await getEnvironmentLogs(input.environmentId, {
    query: input.query,
    type: input.type,
    from: getTimeRangeFrom(input.timeRange ?? "1h"),
    to: new Date().toISOString(),
  });
  return {
    logs: response.data.map((entry) => ({
      message: entry.message,
      level: entry.level,
      type: entry.type,
      logged_at: entry.logged_at,
    })),
    cursor: response.meta.cursor,
  };
}
