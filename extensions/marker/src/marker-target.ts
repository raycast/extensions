// Copyright (c) 2026 SENTINELITE | FTRBND | Kirkland Layton
// SPDX-License-Identifier: MIT

import {
  getCompleteMarkerIntegrationContext,
  MarkerSettings,
  MarkerSessionSummary,
  MarkerSubsessionSummary,
} from "./marker-api";

export type MarkerTarget = {
  session: MarkerSessionSummary;
  subsession: MarkerSubsessionSummary;
};

export async function resolveMarkerTarget(
  settings: MarkerSettings,
  subsessionQuery?: string,
): Promise<MarkerTarget> {
  const context = await getCompleteMarkerIntegrationContext(settings);
  const sessions = context.sessions;
  const session = bestSession(sessions);
  if (!session) {
    throw new Error("No Marker sessions found.");
  }

  const subsessions = context.subsessions.filter(
    (subsession) => subsession.sessionID === session.id,
  );
  const subsession =
    findRequestedSubsession(subsessions, subsessionQuery) ??
    resolveActiveOrLatestSubsessionFromSummaries(
      session.id,
      subsessions,
      context.activeSubsessions,
    );
  if (!subsession) {
    throw new Error(`No sub-sessions found for "${session.name}".`);
  }

  return { session, subsession };
}

export async function resolveExplicitMarkerTarget(
  settings: MarkerSettings,
  sessionQuery: string,
  subsessionQuery: string,
): Promise<MarkerTarget> {
  return resolveSessionMarkerTarget(settings, sessionQuery, subsessionQuery);
}

export async function resolveSessionMarkerTarget(
  settings: MarkerSettings,
  sessionQuery: string,
  subsessionQuery?: string,
): Promise<MarkerTarget> {
  const context = await getCompleteMarkerIntegrationContext(settings);
  const sessions = context.sessions;
  const session = findRequestedSession(sessions, sessionQuery);
  if (!session) {
    throw new Error(`No Marker session found for "${sessionQuery}".`);
  }

  const subsessions = context.subsessions.filter(
    (subsession) => subsession.sessionID === session.id,
  );
  const subsession =
    !subsessionQuery?.trim() || isLatestQuery(subsessionQuery)
      ? resolveActiveOrLatestSubsessionFromSummaries(
          session.id,
          subsessions,
          context.activeSubsessions,
        )
      : findRequestedSubsession(subsessions, subsessionQuery);
  if (!subsession) {
    throw new Error(`No sub-session found for "${subsessionQuery}".`);
  }

  return { session, subsession };
}

export async function resolveActiveOrLatestSubsession(
  settings: MarkerSettings,
  sessionID: string,
  subsessions?: MarkerSubsessionSummary[],
): Promise<MarkerSubsessionSummary | undefined> {
  const context = await getCompleteMarkerIntegrationContext(settings);
  return resolveActiveOrLatestSubsessionFromSummaries(
    sessionID,
    subsessions ??
      context.subsessions.filter(
        (subsession) => subsession.sessionID === sessionID,
      ),
    context.activeSubsessions,
  );
}

export function resolveActiveOrLatestSubsessionFromSummaries(
  sessionID: string,
  subsessions: MarkerSubsessionSummary[],
  activeSubsessions: MarkerSubsessionSummary[],
): MarkerSubsessionSummary | undefined {
  return (
    activeSubsessions.find(
      (subsession) => subsession.sessionID === sessionID,
    ) ??
    latestSubsession(
      subsessions.filter((subsession) => subsession.sessionID === sessionID),
    )
  );
}

function findRequestedSession(
  sessions: MarkerSessionSummary[],
  query: string,
): MarkerSessionSummary | undefined {
  const normalizedQuery = query.trim().toLocaleLowerCase();
  return (
    sessions.find((session) => {
      return (
        session.id.toLocaleLowerCase() === normalizedQuery ||
        session.clientID?.toLocaleLowerCase() === normalizedQuery ||
        session.name.toLocaleLowerCase() === normalizedQuery
      );
    }) ??
    sessions.find((session) =>
      session.name.toLocaleLowerCase().includes(normalizedQuery),
    )
  );
}

export async function resolveLatestMarkerTarget(
  settings: MarkerSettings,
): Promise<MarkerTarget> {
  return resolveMarkerTarget(settings);
}

export async function resolveDefaultMarkerTarget(
  settings: MarkerSettings,
): Promise<MarkerTarget> {
  const context = await getCompleteMarkerIntegrationContext(settings);
  // Fast no-view commands should capture where the user is most likely working:
  // first the newest active sub-session, then the newest known sub-session.
  const subsession =
    latestSubsession(context.activeSubsessions) ??
    latestSubsession(context.subsessions);
  if (!subsession) {
    throw new Error("No Marker sub-sessions found.");
  }

  const session = context.sessions.find(
    (candidate) => candidate.id === subsession.sessionID,
  );
  if (!session) {
    throw new Error("No Marker session found for the selected sub-session.");
  }

  return { session, subsession };
}

export function bestSession(
  sessions: MarkerSessionSummary[],
): MarkerSessionSummary | undefined {
  const running = sessions.filter((session) => session.isRunning);
  return [...(running.length ? running : sessions)].sort(
    compareNewestSession,
  )[0];
}

export function sortedSessionsForPicker(
  sessions: MarkerSessionSummary[],
): MarkerSessionSummary[] {
  return [...sessions].sort(compareSessionActivityThenName);
}

export function sessionPickerSections(sessions: MarkerSessionSummary[]): {
  active: MarkerSessionSummary[];
  inactive: MarkerSessionSummary[];
} {
  const sorted = sortedSessionsForPicker(sessions);
  return {
    active: sorted.filter((session) => session.isRunning === true),
    inactive: sorted.filter((session) => session.isRunning !== true),
  };
}

export function latestSubsession(
  subsessions: MarkerSubsessionSummary[],
): MarkerSubsessionSummary | undefined {
  const active = subsessions.filter((subsession) =>
    isActiveSubsession(subsession),
  );
  return [...(active.length ? active : subsessions)].sort(
    compareNewestSubsession,
  )[0];
}

function findRequestedSubsession(
  subsessions: MarkerSubsessionSummary[],
  query: string | undefined,
): MarkerSubsessionSummary | undefined {
  const normalizedQuery = query?.trim().toLocaleLowerCase();
  if (!normalizedQuery) {
    return undefined;
  }

  return (
    subsessions.find((subsession) => {
      return (
        subsession.id.toLocaleLowerCase() === normalizedQuery ||
        subsession.clientID?.toLocaleLowerCase() === normalizedQuery ||
        subsession.name.toLocaleLowerCase() === normalizedQuery
      );
    }) ??
    subsessions.find((subsession) =>
      subsession.name.toLocaleLowerCase().includes(normalizedQuery),
    )
  );
}

function isLatestQuery(query: string): boolean {
  const normalizedQuery = query.trim().toLocaleLowerCase();
  return [
    "latest",
    "latest sub-session",
    "latest subsession",
    "most recent",
    "most recent sub-session",
    "most recent subsession",
  ].includes(normalizedQuery);
}

export function compareNewestSession(
  lhs: MarkerSessionSummary,
  rhs: MarkerSessionSummary,
): number {
  return (
    runningSessionRank(rhs) - runningSessionRank(lhs) ||
    sessionTimestamp(rhs) - sessionTimestamp(lhs) ||
    summaryName(lhs).localeCompare(summaryName(rhs), undefined, {
      sensitivity: "base",
    })
  );
}

export function compareSessionActivityThenName(
  lhs: MarkerSessionSummary,
  rhs: MarkerSessionSummary,
): number {
  return (
    runningSessionRank(rhs) - runningSessionRank(lhs) ||
    summaryName(lhs).localeCompare(summaryName(rhs), undefined, {
      sensitivity: "base",
    })
  );
}

function sessionTimestamp(session: MarkerSessionSummary): number {
  if (typeof session.lastStartTime === "number" && session.lastStartTime > 0) {
    return session.lastStartTime;
  }
  return dateTimestamp(session.createdAt) || dateTimestamp(session.updatedAt);
}

export function compareNewestSubsession(
  lhs: MarkerSubsessionSummary,
  rhs: MarkerSubsessionSummary,
): number {
  return (
    activeSubsessionRank(rhs) - activeSubsessionRank(lhs) ||
    subsessionTimestamp(rhs) - subsessionTimestamp(lhs) ||
    summaryName(lhs).localeCompare(summaryName(rhs), undefined, {
      sensitivity: "base",
    })
  );
}

function subsessionTimestamp(subsession: MarkerSubsessionSummary): number {
  if (
    typeof subsession.lastStartTime === "number" &&
    subsession.lastStartTime > 0
  ) {
    return subsession.lastStartTime;
  }
  return (
    dateTimestamp(subsession.createdAt) || dateTimestamp(subsession.updatedAt)
  );
}

export function isActiveSubsession(
  subsession: MarkerSubsessionSummary,
): boolean {
  const status = subsession.status?.trim().toLocaleLowerCase();
  return status === "active" || status === "running";
}

function activeSubsessionRank(subsession: MarkerSubsessionSummary): number {
  return isActiveSubsession(subsession) ? 1 : 0;
}

function runningSessionRank(session: MarkerSessionSummary): number {
  return session.isRunning === true ? 1 : 0;
}

function dateTimestamp(value: string | undefined): number {
  if (!value) {
    return 0;
  }
  const timestamp = Date.parse(value);
  return Number.isFinite(timestamp) ? timestamp / 1000 : 0;
}

function summaryName(value: { name?: string }): string {
  return value.name || "Untitled";
}
