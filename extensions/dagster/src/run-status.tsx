import { updateCommandMetadata } from "@raycast/api";
import { graphqlFetch } from "./api";

const RECENT_RUNS_QUERY = `
query recentRuns {
  runsOrError(limit: 30) {
    __typename
    ... on Runs {
      results {
        status
        jobName
      }
    }
  }
}`;

interface RecentRunsResponse {
  runsOrError: {
    __typename: string;
    results?: { status: string; jobName: string }[];
  };
}

const STATUS_ICON: Record<string, string> = {
  SUCCESS: "\uD83C\uDF3F",
  FAILURE: "\uD83D\uDD25",
  STARTED: "\uD83C\uDF3B",
  STARTING: "\uD83C\uDF3B",
  QUEUED: "\uD83C\uDF3B",
  CANCELED: "\uD83C\uDF42",
  CANCELING: "\uD83C\uDF42",
};

function statusIcon(status: string): string {
  return STATUS_ICON[status] ?? "\uD83C\uDF42";
}

export default async function RunStatus() {
  try {
    const data = await graphqlFetch<RecentRunsResponse>(RECENT_RUNS_QUERY);
    const runs =
      data.runsOrError.__typename === "Runs"
        ? (data.runsOrError.results ?? []).filter((r) => !r.jobName.startsWith("__"))
        : [];
    const recent = runs.slice(0, 10);

    const dots = recent.map((r) => statusIcon(r.status)).join("");
    const failed = recent.filter((r) => r.status === "FAILURE").length;
    const subtitle = failed > 0 ? `${dots} (${failed} failed)` : dots;

    await updateCommandMetadata({ subtitle });
  } catch {
    await updateCommandMetadata({ subtitle: "\uD83D\uDD34 Could not fetch runs" });
  }
}
