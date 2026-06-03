import { MenuBarExtra, getPreferenceValues } from "@raycast/api";
import { useEffect, useState } from "react";
import fetch from "node-fetch";

type ClockifyRegion = "eu" | "global" | "usa" | "uk" | "au";

const CLOCKIFY_API_BASE_BY_REGION: Record<ClockifyRegion, string> = {
  eu: "https://euc1.clockify.me/api/v1",
  global: "https://api.clockify.me/api/v1",
  usa: "https://use2.clockify.me/api/v1",
  uk: "https://euw2.clockify.me/api/v1",
  au: "https://apse2.clockify.me/api/v1",
};

const CLOCKIFY_REPORT_BASE_BY_REGION: Record<ClockifyRegion, string> = {
  eu: "https://euc1.clockify.me/report/v1",
  global: "https://reports.api.clockify.me/v1",
  usa: "https://use2.clockify.me/report/v1",
  uk: "https://euw2.clockify.me/report/v1",
  au: "https://apse2.clockify.me/report/v1",
};

const CLOCKIFY_REGION_LABEL_BY_REGION: Record<ClockifyRegion, string> = {
  eu: "EU",
  global: "Global",
  usa: "USA",
  uk: "UK",
  au: "AU",
};

const CLOCKIFY_REGIONS: ClockifyRegion[] = ["eu", "global", "usa", "uk", "au"];

interface Preferences {
  apiToken: string;
  apiRegion: ClockifyRegion;
  refreshInterval?: string;
}

interface ClockifyUserResponse {
  activeWorkspace: string;
}

interface ClockifyWorkspaceUser {
  id: string;
  name: string;
  status?: string;
}

interface ClockifyTimeEntry {
  description?: string;
  userId?: string;
  project?: {
    name?: string;
  };
  task?: {
    name?: string;
  };
}

interface ClockifySummaryReportGroup {
  duration?: number;
  id?: string;
  name?: string;
  userId?: string;
}

interface ClockifySummaryReportResponse {
  groupOne?: ClockifySummaryReportGroup[];
}

interface WorkspaceContext {
  apiBaseUrl: string;
  reportBaseUrl: string;
  workspaceId: string;
}

interface TeamMemberStatus {
  id: string;
  minutes: number;
  name: string;
  status: string;
}

async function fetchClockifyJson<T>(
  url: string,
  headers: Record<string, string>,
  body?: unknown,
  timeoutMs = 8000,
) {
  const controller = new AbortController();
  let timeout: NodeJS.Timeout;
  const timeoutPromise = new Promise<never>((_, reject) => {
    timeout = setTimeout(() => {
      controller.abort();
      reject(new Error(`Clockify request timed out after ${timeoutMs}ms`));
    }, timeoutMs);
  });

  try {
    const response = await Promise.race([
      fetch(url, {
        body: body ? JSON.stringify(body) : undefined,
        headers: body
          ? { ...headers, "Content-Type": "application/json" }
          : headers,
        method: body ? "POST" : "GET",
        signal: controller.signal,
      }),
      timeoutPromise,
    ]);
    if (!response.ok) {
      throw new Error(`${response.status} ${response.statusText} at ${url}`);
    }

    return (await response.json()) as T;
  } finally {
    clearTimeout(timeout!);
  }
}

async function findClockifyWorkspace(
  headers: Record<string, string>,
  preferredRegion: ClockifyRegion,
): Promise<WorkspaceContext> {
  const regionsToTry = [
    preferredRegion,
    ...CLOCKIFY_REGIONS.filter((region) => region !== preferredRegion),
  ];
  const errors: string[] = [];

  for (const region of regionsToTry) {
    const apiBaseUrl = CLOCKIFY_API_BASE_BY_REGION[region];

    try {
      const userData = await fetchClockifyJson<ClockifyUserResponse>(
        `${apiBaseUrl}/user`,
        headers,
      );

      return {
        apiBaseUrl,
        reportBaseUrl: CLOCKIFY_REPORT_BASE_BY_REGION[region],
        workspaceId: userData.activeWorkspace,
      };
    } catch (error) {
      errors.push(
        `${CLOCKIFY_REGION_LABEL_BY_REGION[region]}: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
    }
  }

  throw new Error(
    `Could not authenticate with Clockify. Attempts: ${errors.join(" | ")}`,
  );
}

function getTodayRange() {
  const start = new Date();
  start.setHours(0, 0, 0, 0);

  return {
    end: new Date(),
    start,
  };
}

function formatLocalClockifyDate(date: Date) {
  const offsetMs = date.getTimezoneOffset() * 60000;
  return new Date(date.getTime() - offsetMs).toISOString().slice(0, 19);
}

function formatMinutes(minutes: number | null) {
  if (minutes === null) return "calculating";

  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;

  if (hours === 0) return `${remainingMinutes}m`;
  if (remainingMinutes === 0) return `${hours}h`;
  return `${hours}h ${remainingMinutes}m`;
}

function getActiveTask(userId: string, activeEntries: ClockifyTimeEntry[]) {
  const entry = activeEntries.find(
    (activeEntry) => activeEntry.userId === userId,
  );
  if (!entry) return "Stopped";

  const projectName = entry.project ? entry.project.name : "No Project";
  const taskName = entry.task
    ? entry.task.name
    : entry.description || "No Task";

  return `${projectName} - ${taskName}`;
}

function buildCompetitionLabel(members: TeamMemberStatus[]) {
  const [leader, second] = members;

  if (!leader) return "No users";
  if (!second) return `${leader.name}: ${formatMinutes(leader.minutes)}`;

  const difference = leader.minutes - second.minutes;
  if (difference === 0) return `Tie: ${formatMinutes(leader.minutes)}`;

  return `${leader.name} +${formatMinutes(difference)}`;
}

function buildMenuTitle(members: TeamMemberStatus[]) {
  const totalMinutes = members.reduce(
    (total, member) => total + member.minutes,
    0,
  );
  const activeCount = members.filter(
    (member) => member.status !== "Stopped",
  ).length;

  return `${members.length} users · ${formatMinutes(totalMinutes)} · ${activeCount} active`;
}

export default function Command() {
  const preferences = getPreferenceValues<Preferences>();
  const refreshIntervalMs =
    Number(preferences.refreshInterval) * 1000 || 300000;

  const [members, setMembers] = useState<TeamMemberStatus[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [lastUpdatedAt, setLastUpdatedAt] = useState<Date | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    async function fetchClockifyData() {
      try {
        setIsLoading(true);
        setErrorMessage(null);

        const headers = { "x-api-key": preferences.apiToken };
        const { apiBaseUrl, reportBaseUrl, workspaceId } =
          await findClockifyWorkspace(headers, preferences.apiRegion);

        const users = await fetchClockifyJson<ClockifyWorkspaceUser[]>(
          `${apiBaseUrl}/workspaces/${workspaceId}/users`,
          headers,
        );
        const activeUsers = users.filter((user) => user.status !== "INACTIVE");

        const activeEntries = await fetchClockifyJson<ClockifyTimeEntry[]>(
          `${apiBaseUrl}/workspaces/${workspaceId}/time-entries/status/in-progress?page-size=1000`,
          headers,
        );

        const getTodayTrackedMinutes = async (userId: string) => {
          const { end, start } = getTodayRange();
          const report = await fetchClockifyJson<ClockifySummaryReportResponse>(
            `${reportBaseUrl}/workspaces/${workspaceId}/reports/summary`,
            headers,
            {
              dateRangeEnd: `${formatLocalClockifyDate(end)}Z`,
              dateRangeStart: `${formatLocalClockifyDate(start)}Z`,
              summaryFilter: {
                groups: ["USER"],
              },
              timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
              users: {
                contains: "CONTAINS",
                ids: [userId],
              },
            },
          );

          const userGroup = report.groupOne?.find(
            (group) =>
              group.id === userId ||
              group.userId === userId ||
              report.groupOne?.length === 1,
          );
          return Math.round((userGroup?.duration ?? 0) / 60);
        };

        const nextMembers = await Promise.all(
          activeUsers.map(async (user) => ({
            id: user.id,
            minutes: await getTodayTrackedMinutes(user.id),
            name: user.name,
            status: getActiveTask(user.id, activeEntries),
          })),
        );

        nextMembers.sort(
          (a, b) => b.minutes - a.minutes || a.name.localeCompare(b.name),
        );

        setMembers(nextMembers);
        setLastUpdatedAt(new Date());
      } catch (error) {
        console.error("Clockify error:", error);
        setErrorMessage(error instanceof Error ? error.message : String(error));
      } finally {
        setIsLoading(false);
      }
    }

    fetchClockifyData();
    const refresh = setInterval(fetchClockifyData, refreshIntervalMs);

    return () => clearInterval(refresh);
  }, [preferences.apiRegion, preferences.apiToken, refreshIntervalMs]);

  return (
    <MenuBarExtra
      icon="⏱️"
      title={buildMenuTitle(members)}
      isLoading={isLoading}
    >
      {errorMessage ? (
        <MenuBarExtra.Item title="Clockify Error" subtitle={errorMessage} />
      ) : null}
      <MenuBarExtra.Item
        title={buildCompetitionLabel(members)}
        subtitle={
          lastUpdatedAt
            ? `Updated: ${lastUpdatedAt.toLocaleTimeString(undefined, {
                hour: "2-digit",
                minute: "2-digit",
              })}`
            : "Not updated yet"
        }
      />
      <MenuBarExtra.Section title="Team">
        {members.map((member, index) => (
          <MenuBarExtra.Item
            key={member.id}
            title={`${index + 1}. ${member.name} · ${formatMinutes(member.minutes)}`}
            subtitle={member.status}
          />
        ))}
      </MenuBarExtra.Section>
    </MenuBarExtra>
  );
}
