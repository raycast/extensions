import { getEnvironmentLogs } from "../api/environments";

type Input = {
  /** The ID of the environment whose application logs to retrieve */
  environmentId: string;
  /** Optional search query to filter logs */
  query?: string;
  /** Optional log type filter: "access", "application", "exception", or "system" */
  type?: string;
};

export default async function (input: Input) {
  const response = await getEnvironmentLogs(input.environmentId, {
    query: input.query,
    type: input.type,
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
