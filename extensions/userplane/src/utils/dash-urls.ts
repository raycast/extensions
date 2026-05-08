import { getPreferenceValues } from "@raycast/api";

import { normalizeOrigin } from "./normalize-url";

const DEFAULT_DASH_HOST = "dash.userplane.io";

export function getDashBaseUrl(): string {
  const { dashBaseUrl } = getPreferenceValues<Preferences>();
  return normalizeOrigin(dashBaseUrl, DEFAULT_DASH_HOST);
}

export function dashHomeUrl(): string {
  return getDashBaseUrl();
}

export function dashDevelopersUrl(): string {
  return `${getDashBaseUrl()}/_/account?tab=developers`;
}

export function dashWorkspaceUrl(workspaceId: string): string {
  return `${getDashBaseUrl()}/workspace/${encodeURIComponent(workspaceId)}`;
}

export function dashRecordingsUrl(options?: { workspaceId?: string; creators?: string[] }): string {
  const base = options?.workspaceId
    ? `${dashWorkspaceUrl(options.workspaceId)}/recordings`
    : `${getDashBaseUrl()}/_/recordings`;
  if (!options?.creators?.length) return base;
  const filtered = options.creators.filter((id) => Boolean(id));
  if (filtered.length === 0) return base;
  return `${base}?creators=${filtered.map((id) => encodeURIComponent(id)).join(",")}`;
}

export function dashRecordingPlaybackUrl(workspaceId: string, recordingId: string): string {
  return `${dashWorkspaceUrl(workspaceId)}/recordings/${encodeURIComponent(recordingId)}`;
}

export function dashLinksUrl(options?: { workspaceId?: string; creators?: string[] }): string {
  const base = options?.workspaceId ? `${dashWorkspaceUrl(options.workspaceId)}/links` : `${getDashBaseUrl()}/_/links`;
  if (!options?.creators?.length) return base;
  const filtered = options.creators.filter((id) => Boolean(id));
  if (filtered.length === 0) return base;
  return `${base}?creators=${filtered.map((id) => encodeURIComponent(id)).join(",")}`;
}

export function dashLinkRecordingsUrl(workspaceId: string, linkId: string): string {
  return `${dashWorkspaceUrl(workspaceId)}/recordings?links=${encodeURIComponent(linkId)}`;
}
