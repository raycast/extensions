import { ldFetch, ldFetchAll } from "./client";
import {
  LDAuditLogEntry,
  LDAuditLogResponse,
  LDEnvironment,
  LDFlag,
  LDFlagStatusResponse,
  LDMember,
  LDProject,
  LDSegment,
} from "../types";

const enc = encodeURIComponent;

/** Largest page size these collection endpoints accept. */
const PAGE_SIZE = 100;

export function fetchFlag(projectKey: string, flagKey: string): Promise<LDFlag> {
  return ldFetch<LDFlag>(`/api/v2/flags/${enc(projectKey)}/${enc(flagKey)}`);
}

// The collection endpoints below are fully drained by following `_links.next`,
// so accounts with more than one page of projects, environments, tags or
// segments see everything rather than the first page only.

export function fetchProjects(): Promise<LDProject[]> {
  return ldFetchAll<LDProject>("/api/v2/projects", { limit: PAGE_SIZE, sort: "name" });
}

export function fetchEnvironments(projectKey: string): Promise<LDEnvironment[]> {
  return ldFetchAll<LDEnvironment>(`/api/v2/projects/${enc(projectKey)}/environments`, { limit: PAGE_SIZE });
}

export function fetchFlagStatus(projectKey: string, flagKey: string): Promise<LDFlagStatusResponse> {
  return ldFetch<LDFlagStatusResponse>(`/api/v2/flag-status/${enc(projectKey)}/${enc(flagKey)}`);
}

export function fetchFlagTags(): Promise<string[]> {
  return ldFetchAll<string>("/api/v2/tags", { kind: "flag", limit: PAGE_SIZE });
}

export function fetchSegments(projectKey: string, environmentKey: string): Promise<LDSegment[]> {
  return ldFetchAll<LDSegment>(`/api/v2/segments/${enc(projectKey)}/${enc(environmentKey)}`, { limit: PAGE_SIZE });
}

export function fetchMe(): Promise<LDMember> {
  return ldFetch<LDMember>("/api/v2/members/me");
}

export interface AuditLogQuery {
  projectKey: string;
  flagKey?: string;
  environmentKey?: string;
  /** Unix epoch millis; only entries before this timestamp are returned. */
  before?: number;
}

/** The audit log endpoint caps `limit` at 20. */
export const AUDIT_LOG_PAGE_SIZE = 20;

export async function fetchAuditLog(query: AuditLogQuery): Promise<LDAuditLogEntry[]> {
  const spec = `proj/${query.projectKey}:env/${query.environmentKey ?? "*"}:flag/${query.flagKey ?? "*"}`;
  const result = await ldFetch<LDAuditLogResponse>("/api/v2/auditlog", {
    spec,
    limit: AUDIT_LOG_PAGE_SIZE,
    before: query.before,
  });
  return result.items ?? [];
}
