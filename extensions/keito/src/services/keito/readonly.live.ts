// Read-only checks against the live Keito API. Nothing here creates, changes, or deletes data.
// Credentials come from KEITO_API_KEY / KEITO_ACCOUNT_ID (see `npm run test:live`) and are never printed.
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { KeitoApi } from "./api";
import { validateCredentials } from "./config";
import { KeitoError } from "./errors";
import { FetchLike } from "./http";
import { entryEditability, normalizeTimeEntry } from "./normalize";
import { Project, RawTimeEntry } from "./types";

const credentials = validateCredentials({ token: process.env.KEITO_API_KEY, accountID: process.env.KEITO_ACCOUNT_ID });

interface Exchange {
  method: string;
  path: string;
  status: number;
  responseHeaders: string[];
}
const exchanges: Exchange[] = [];
const report: Record<string, unknown> = {};

/** Records method, path, status, and response header names. Request headers are never recorded. */
const recordingFetch: FetchLike = async (url, init) => {
  const response = await fetch(url, init);
  const parsed = new URL(url);
  const headerNames: string[] = [];
  response.headers.forEach((_value, name) => headerNames.push(name));
  exchanges.push({
    method: init.method,
    path: parsed.pathname + (parsed.search ? "?…" : ""),
    status: response.status,
    responseHeaders: headerNames,
  });
  return response;
};

function redact(text: string): string {
  return text.split(credentials.token).join("<api-key>").split(credentials.accountId).join("<company-id>");
}

function keyTypes(obj: Record<string, unknown> | undefined): Record<string, string> {
  if (!obj) return {};
  return Object.fromEntries(
    Object.entries(obj).map(([k, v]) => [
      k,
      v === null
        ? "null"
        : Array.isArray(v)
          ? "array"
          : typeof v === "object"
            ? `object{${Object.keys(v as object).join(",")}}`
            : typeof v,
    ]),
  );
}

const api = new KeitoApi({ ...credentials, fetch: recordingFetch });
let userId = "";
let projects: Project[] = [];

beforeAll(() => {
  report.startedAt = new Date().toISOString();
});

afterAll(() => {
  report.requests = exchanges.map((e) => `${e.method} ${e.path} -> ${e.status}`);
  report.responseHeaderNames = [...new Set(exchanges.flatMap((e) => e.responseHeaders))].sort();
  console.log(`\nLIVE REPORT\n${redact(JSON.stringify(report, null, 2))}`);
});

describe("live read-only: onboarding", () => {
  it("verifies identity and company with GET /users/me", async () => {
    const raw = await api.http.request<Record<string, unknown>>("GET", "/users/me");
    report.usersMeFields = keyTypes(raw.data);
    const identity = await api.getIdentity();
    userId = identity.userId;
    report.identity = {
      credentialType: identity.credentialType,
      userType: identity.userType,
      roles: identity.roles,
      hasCompanyName: !!identity.companyName,
      companyMatchesPreference: identity.companyId === credentials.accountId,
      features: identity.features,
    };
    expect(identity.credentialType).toBe("full_access");
  });

  it("classifies a wrong Company ID", async () => {
    const bad = new KeitoApi({
      ...credentials,
      accountId: "cm-not-a-real-company",
      fetch: recordingFetch,
      maxRetries: 0,
    });
    const error = await bad.getIdentity().catch((e) => e);
    report.wrongCompanyId = {
      kind: error.kind,
      status: error.status,
      code: error.code,
      serverMessage: error.serverMessage,
    };
    expect(error).toBeInstanceOf(KeitoError);
    expect(error.isSetupProblem || error.kind === "forbidden").toBe(true);
  });

  it("classifies an invalid key", async () => {
    const bad = new KeitoApi({
      ...credentials,
      token: "kto_FAKE_invalid_for_live_test",
      fetch: recordingFetch,
      maxRetries: 0,
    });
    const error = await bad.getIdentity().catch((e) => e);
    report.invalidKey = {
      kind: error.kind,
      status: error.status,
      code: error.code,
      serverMessage: error.serverMessage,
    };
    expect(error.kind).toBe("invalid_credentials");
  });
});

describe("live read-only: discovery", () => {
  it("lists active projects and agrees across page sizes (links.next pagination)", async () => {
    const firstPage = await api.http.request<Record<string, unknown>>("GET", "/projects", {
      query: { is_active: true, per_page: 1 },
    });
    const envelope = firstPage.data as {
      links?: Record<string, unknown>;
      total_entries?: number;
      total_pages?: number;
      projects?: unknown[];
    };
    report.projectsEnvelope = {
      envelopeFields: Object.keys(envelope),
      links: Object.fromEntries(
        Object.entries(envelope.links ?? {}).map(([k, v]) => [
          k,
          typeof v === "string" ? (v.startsWith("http") ? "absolute" : "relative") : v,
        ]),
      ),
      totalEntries: envelope.total_entries,
      totalPages: envelope.total_pages,
      projectFields: keyTypes((envelope.projects?.[0] ?? undefined) as Record<string, unknown> | undefined),
    };

    projects = await api.listProjects();
    const small = new KeitoApi({ ...credentials, fetch: recordingFetch, perPage: 1, maxPages: 60 });
    const paged = projects.length <= 50 ? await small.listProjects() : projects;
    report.projects = {
      count: projects.length,
      withClient: projects.filter((p) => p.clientName).length,
      withCode: projects.filter((p) => p.code).length,
      pagedOneAtATimeCount: paged.length,
      idsAreStrings: projects.every((p) => typeof p.id === "string"),
    };
    expect(paged.map((p) => p.id).sort()).toEqual(projects.map((p) => p.id).sort());
    expect(projects.length).toBeGreaterThan(0);
  });

  it("lists tasks with project context", async () => {
    const sample = projects.slice(0, 3);
    const counts: number[] = [];
    let taskFields: Record<string, string> = {};
    for (const project of sample) {
      const raw = await api.http.request<{ tasks?: Record<string, unknown>[] }>("GET", "/tasks", {
        query: { project_id: project.id, is_active: true, per_page: 100 },
      });
      if (raw.data.tasks?.[0]) taskFields = keyTypes(raw.data.tasks[0]);
      counts.push((await api.listProjectTasks(project.id)).length);
    }
    report.tasks = { projectsSampled: sample.length, taskCounts: counts, taskFields };
    expect(counts.length).toBe(sample.length);
  });
});

describe("live read-only: time entries", () => {
  it("normalizes the last 30 days of your entries", async () => {
    const to = new Date();
    const from = new Date(to.getTime() - 30 * 24 * 3600 * 1000);
    const day = (d: Date) => d.toISOString().slice(0, 10);
    const raw = await api.http.paginate<RawTimeEntry>("/time_entries", "time_entries", {
      user_id: userId,
      from: day(from),
      to: day(to),
    });
    const entries = raw.map((r) => normalizeTimeEntry(r));
    const count = (pred: (e: (typeof entries)[number]) => boolean) => entries.filter(pred).length;
    report.timeEntries = {
      range: `${day(from)}..${day(to)}`,
      count: entries.length,
      rawFields: keyTypes(raw[0] as Record<string, unknown> | undefined),
      nestedProjectObjects: raw.filter((r) => r.project && typeof r.project === "object").length,
      flatProjectIds: raw.filter((r) => r.project_id !== undefined).length,
      idTypes: [...new Set(raw.map((r) => typeof r.id))],
      hoursTypes: [...new Set(raw.map((r) => typeof r.hours))],
      approvalStatuses: Object.fromEntries(
        [...new Set(raw.map((r) => String(r.approval_status)))].map((s) => [
          s,
          raw.filter((r) => String(r.approval_status) === s).length,
        ]),
      ),
      locked: count((e) => e.isLocked),
      closed: count((e) => e.isClosed),
      approvedButNotClosed: count((e) => e.approvalStatus === "approved" && !e.isClosed),
      notEditable: count((e) => !entryEditability(e).canEdit),
      running: count((e) => e.isRunning),
      withStartedTime: count((e) => !!e.startedTime),
      startedTimeFormatOk: entries.every((e) => !e.startedTime || /^\d{2}:\d{2}$/.test(e.startedTime)),
      sources: [...new Set(entries.map((e) => e.source))],
      unknownNames: count((e) => e.projectName === "Unknown project" || e.taskName === "Unknown task"),
      onlyOwnEntries: entries.every((e) => !e.userId || e.userId === userId),
    };
    expect(entries.every((e) => e.spentDate >= day(from) && e.spentDate <= day(to))).toBe(true);
  });

  it("finds running timers with the is_running filter", async () => {
    const running = await api.listRunningEntries(userId);
    report.runningTimers = {
      count: running.length,
      hasTimerStartedAt: running.map((e) => !!e.timerStartedAt),
      spentDates: running.map((e) => e.spentDate),
    };
    expect(running.length).toBeLessThanOrEqual(1);
  });
});
