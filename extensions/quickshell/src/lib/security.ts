import { existsSync } from "node:fs";
import { isAbsolute, resolve } from "node:path";
import type { StoredWorkspace, Workspace, WorkspaceSecurityMetadata } from "./schema";
import { isAbsoluteDirectory, normalizeCompanionApps, validateCommand, validateWorkspace } from "./validation";
import { buildSelectedLaunchWorkspace, parseWslUncPath } from "./windows-launch";
import trustFeatures from "./workspace-trust-features.json";

/** Ship default from shared/workspace-trust-features.json (synced into this package). */
export const WORKSPACE_TRUST_DEFAULT_ENABLED = trustFeatures.enabled === true;

/**
 * Test override stack. Null means use the shared JSON default.
 * Must be restored in afterEach; prefer setWorkspaceTrustEnabledForTests in beforeEach/afterEach.
 */
let workspaceTrustTestOverride: boolean | null = null;

export function isWorkspaceTrustEnabled(): boolean {
  return workspaceTrustTestOverride ?? WORKSPACE_TRUST_DEFAULT_ENABLED;
}

/** Test seam only. Pass null to clear the override. */
export function setWorkspaceTrustEnabledForTests(enabled: boolean | null): void {
  workspaceTrustTestOverride = enabled;
}

/**
 * Security metadata for imported / restored / otherwise external ingress.
 * Trusted while enforcement is off so re-enabling later does not suddenly
 * lock users out of workspaces they already used.
 */
export function createIngressSecurity(): WorkspaceSecurityMetadata {
  return { isTrusted: !isWorkspaceTrustEnabled(), revision: 1 };
}

/** While enforcement is off, rewrite untrusted rows so re-enable does not revive stale denials. */
export function coerceTrustedWhileDisabled(
  securityById: Record<string, { isTrusted: boolean; revision: number }> | undefined,
  workspaceIds: string[],
): { security: Record<string, { isTrusted: boolean; revision: number }>; changed: boolean } {
  const next: Record<string, { isTrusted: boolean; revision: number }> = {
    ...(securityById ?? {}),
  };
  let changed = false;
  if (isWorkspaceTrustEnabled()) {
    return { security: next, changed };
  }

  for (const id of workspaceIds) {
    const current = next[id] ?? { isTrusted: true, revision: 1 };
    if (!current.isTrusted) {
      next[id] = { ...current, isTrusted: true };
      changed = true;
    } else if (!next[id]) {
      next[id] = current;
    }
  }

  return { security: next, changed };
}

export type WorkspaceAuthorizationRequest =
  | { kind: "terminal" }
  | { kind: "launchEntry"; launchId: string }
  | { kind: "companion"; companionId: string }
  | { kind: "url"; url: string | null | undefined }
  | { kind: "directory" }
  | { kind: "copyPath" }
  | { kind: "grantTrust" }
  | { kind: "revokeTrust" };

export type WorkspaceIssueCode =
  | "WorkspaceNotFound"
  | "WorkspaceUntrusted"
  | "InvalidDirectory"
  | "DirectoryMissing"
  | "InvalidCommand"
  | "InvalidLaunch"
  | "InvalidUrl"
  | "InvalidCompanion"
  | "CompanionExecutableUnavailable"
  | "DirectoryOpenNotAllowed"
  | "ActionNotAllowed"
  | "WorkspaceChangedSinceReview";

export type WorkspaceIssue = { code: WorkspaceIssueCode; message: string; blocking: boolean };
export type WorkspaceRisk = { code: string; description: string };
export type WorkspaceEffectiveValues = {
  directory: string | null;
  url: string | null;
  executablePath: string | null;
  workingDirectory: string | null;
  arguments: string | null;
  command: string | null;
};

export type WorkspaceAuthorizationResult = {
  isAllowed: boolean;
  primaryIssueCode: WorkspaceIssueCode | null;
  issues: WorkspaceIssue[];
  risks: WorkspaceRisk[];
  effectiveValues: WorkspaceEffectiveValues;
  revision: number;
};

export type WorkspaceReviewToken = { workspaceId: string; revision: number; digest: string };
export type AuthorizedCompanionEffect = {
  companionId: string;
  executablePath: string;
  arguments: string | null;
  workingDirectory: string;
};
export type AuthorizedPostLaunchEffectsPlan = {
  companions: AuthorizedCompanionEffect[];
  devServerUrl: string | null;
};
export type AuthorizedPostLaunchEffects = {
  plan: AuthorizedPostLaunchEffectsPlan;
  warnings: string[];
};

export function authorize(
  workspace: StoredWorkspace | null,
  request: WorkspaceAuthorizationRequest,
): WorkspaceAuthorizationResult {
  if (!workspace) {
    return result(
      false,
      "WorkspaceNotFound",
      [{ code: "WorkspaceNotFound", message: "Workspace was not found.", blocking: true }],
      [],
      null,
      null,
      null,
      null,
      null,
      null,
      0,
    );
  }

  const content =
    request.kind === "launchEntry"
      ? buildSelectedLaunchWorkspace(workspace.content, request.launchId)
      : workspace.content;
  if (!content) {
    return result(
      false,
      "InvalidLaunch",
      [{ code: "InvalidLaunch", message: "The selected launch entry was not found.", blocking: true }],
      [],
      null,
      null,
      null,
      null,
      null,
      null,
      workspace.revision,
    );
  }
  const issues: WorkspaceIssue[] = [];
  const risks: WorkspaceRisk[] = [];
  const directory = canonicalDirectory(content.directory);
  const requiresDirectory =
    request.kind === "terminal" ||
    request.kind === "launchEntry" ||
    request.kind === "companion" ||
    request.kind === "directory" ||
    request.kind === "copyPath" ||
    request.kind === "grantTrust";
  if (requiresDirectory && !directory) {
    issues.push({
      code: "InvalidDirectory",
      message: "Workspace directory is not a valid absolute path.",
      blocking: true,
    });
  } else if (
    directory &&
    (request.kind === "terminal" || request.kind === "launchEntry" || request.kind === "grantTrust") &&
    isLocalDirectory(directory) &&
    !existsSync(directory)
  ) {
    issues.push({ code: "DirectoryMissing", message: "Workspace directory does not exist.", blocking: true });
  }

  if (request.kind === "terminal" || request.kind === "launchEntry" || request.kind === "grantTrust") {
    const commandResult = validateCommand(content.command);
    if (!commandResult.ok) {
      issues.push({ code: "InvalidCommand", message: commandResult.message, blocking: true });
    }
  }
  if (request.kind === "grantTrust") {
    for (const companion of normalizeCompanionApps(content)) {
      if (
        !companion.path ||
        companion.path.length > 1024 ||
        /[\r\n\0]/.test(companion.path) ||
        (companion.arguments && /[\r\n\0]/.test(companion.arguments))
      ) {
        issues.push({
          code: "InvalidCompanion",
          message: "Companion executable configuration is invalid.",
          blocking: true,
        });
        break;
      }
    }
  }
  if (content.command) {
    risks.push({ code: "command", description: "This workspace can execute arbitrary code." });
  }
  if (content.runAsAdmin || content.launches.some((launch) => launch.runAsAdmin)) {
    risks.push({ code: "elevation", description: "This workspace can request elevation and UAC." });
  }
  if (content.companionApps?.length || content.companionAppPath) {
    risks.push({ code: "companions", description: "This workspace can start companion processes." });
  }
  if (content.devServerUrl || content.repoUrl) {
    risks.push({ code: "urls", description: "This workspace can open external URLs." });
  }

  const structural = validateWorkspace(content);
  if (
    !structural.ok &&
    request.kind !== "copyPath" &&
    request.kind !== "directory" &&
    request.kind !== "url" &&
    request.kind !== "companion"
  ) {
    issues.push({
      code: structural.message.includes("command") ? "InvalidCommand" : "InvalidLaunch",
      message: structural.message,
      blocking: true,
    });
  }

  let url: string | null = null;
  if (request.kind === "url") {
    if (!request.url || !isHttpUrl(request.url)) {
      issues.push({ code: "InvalidUrl", message: "Only absolute HTTP(S) URLs may be opened.", blocking: true });
    } else {
      url = request.url.trim();
    }
  }

  let executablePath: string | null = null;
  let companionArguments: string | null = null;
  if (request.kind === "companion") {
    const matchingCompanions = normalizeCompanionApps(content).filter((entry) => entry.id === request.companionId);
    const companion = matchingCompanions.length === 1 ? matchingCompanions[0] : null;
    if (
      !companion ||
      !companion.path ||
      companion.path.length > 1024 ||
      /[\r\n\0]/.test(companion.path) ||
      (companion.arguments && /[\r\n\0]/.test(companion.arguments))
    ) {
      issues.push({
        code: "InvalidCompanion",
        message: "Companion executable configuration is invalid.",
        blocking: true,
      });
    } else {
      executablePath = resolveExecutablePath(companion.path);
      companionArguments = companion.arguments ?? null;
    }
    if (companion && !executablePath && !issues.some((issue) => issue.code === "InvalidCompanion")) {
      issues.push({
        code: "CompanionExecutableUnavailable",
        message: "The companion executable could not be resolved.",
        blocking: true,
      });
    }
  }

  if (
    isWorkspaceTrustEnabled() &&
    !workspace.security.isTrusted &&
    (request.kind === "terminal" ||
      request.kind === "launchEntry" ||
      request.kind === "companion" ||
      request.kind === "url" ||
      request.kind === "directory")
  ) {
    issues.push({
      code: "WorkspaceUntrusted",
      message: "Trust this workspace before starting external processes or opening it.",
      blocking: true,
    });
  }

  if (request.kind === "directory") {
    if (isWorkspaceTrustEnabled() && !workspace.security.isTrusted) {
      issues.push({
        code: "DirectoryOpenNotAllowed",
        message: "Untrusted workspaces cannot open directories.",
        blocking: true,
      });
    } else if (!directory || !isLocalDirectory(directory) || !existsSync(directory)) {
      issues.push({
        code: "DirectoryOpenNotAllowed",
        message: "Only existing rooted local drive directories can be opened.",
        blocking: true,
      });
    }
  }

  const primary = primaryIssue(issues);
  const allowed =
    request.kind === "copyPath"
      ? !issues.some((issue) => issue.code === "InvalidDirectory")
      : request.kind === "revokeTrust"
        ? true
        : issues.length === 0;
  return result(
    allowed,
    primary,
    issues,
    risks,
    directory,
    url,
    executablePath,
    directory,
    companionArguments,
    content.command ?? null,
    workspace.revision,
  );
}

export function authorizePostLaunchEffects(
  workspace: StoredWorkspace,
  options?: { includeCompanion?: boolean; includeDevServer?: boolean },
): AuthorizedPostLaunchEffects {
  const companions: AuthorizedCompanionEffect[] = [];
  const warnings: string[] = [];

  if (options?.includeCompanion ?? true) {
    const normalizedCompanions = normalizeCompanionApps(workspace.content);
    const effectsWorkspace = {
      ...workspace,
      content: { ...workspace.content, companionApps: normalizedCompanions },
    };
    for (const companion of normalizedCompanions.filter((entry) => entry.openOnLaunch)) {
      const authorization = authorize(effectsWorkspace, { kind: "companion", companionId: companion.id });
      if (
        authorization.isAllowed &&
        authorization.effectiveValues.executablePath &&
        authorization.effectiveValues.workingDirectory
      ) {
        companions.push({
          companionId: companion.id,
          executablePath: authorization.effectiveValues.executablePath,
          arguments: authorization.effectiveValues.arguments,
          workingDirectory: authorization.effectiveValues.workingDirectory,
        });
      } else {
        warnings.push(
          `Companion "${companion.id}" was suppressed: ${authorization.issues.map((issue) => issue.message).join(" ")}`,
        );
      }
    }
  }

  let devServerUrl: string | null = null;
  if (
    (options?.includeDevServer ?? true) &&
    workspace.content.openDevServerOnLaunch &&
    workspace.content.devServerUrl
  ) {
    const authorization = authorize(workspace, { kind: "url", url: workspace.content.devServerUrl });
    if (authorization.isAllowed && authorization.effectiveValues.url) {
      devServerUrl = authorization.effectiveValues.url;
    } else {
      warnings.push(`Dev server was suppressed: ${authorization.issues.map((issue) => issue.message).join(" ")}`);
    }
  }

  return { plan: { companions, devServerUrl }, warnings };
}

export function createReviewToken(workspace: StoredWorkspace): WorkspaceReviewToken {
  return { workspaceId: workspace.content.id, revision: workspace.revision, digest: digest(workspace.content) };
}

export function matchesReviewToken(workspace: StoredWorkspace, token: WorkspaceReviewToken): boolean {
  return (
    workspace.content.id.toLowerCase() === token.workspaceId.toLowerCase() &&
    workspace.revision === token.revision &&
    digest(workspace.content) === token.digest
  );
}

export function digest(workspace: Workspace): string {
  return JSON.stringify({
    id: workspace.id,
    directory: workspace.directory,
    terminal: workspace.terminal,
    wtProfile: workspace.wtProfile,
    command: workspace.command,
    runAsAdmin: workspace.runAsAdmin,
    launches: workspace.launches,
    devServerUrl: workspace.devServerUrl,
    openDevServerOnLaunch: workspace.openDevServerOnLaunch,
    repoUrl: workspace.repoUrl,
    companionApps: workspace.companionApps,
    companionAppPath: workspace.companionAppPath,
    companionAppArguments: workspace.companionAppArguments,
    openCompanionAppOnLaunch: workspace.openCompanionAppOnLaunch,
  });
}

function result(
  isAllowed: boolean,
  primaryIssueCode: WorkspaceIssueCode | null,
  issues: WorkspaceIssue[],
  risks: WorkspaceRisk[],
  directory: string | null,
  url: string | null,
  executablePath: string | null,
  workingDirectory: string | null,
  effectiveArguments: string | null,
  command: string | null,
  revision = 0,
): WorkspaceAuthorizationResult {
  return {
    isAllowed,
    primaryIssueCode,
    issues,
    risks,
    effectiveValues: { directory, url, executablePath, workingDirectory, arguments: effectiveArguments, command },
    revision,
  };
}

function primaryIssue(issues: WorkspaceIssue[]): WorkspaceIssueCode | null {
  const precedence: WorkspaceIssueCode[] = [
    "WorkspaceNotFound",
    "InvalidDirectory",
    "DirectoryMissing",
    "InvalidCommand",
    "InvalidLaunch",
    "InvalidUrl",
    "InvalidCompanion",
    "CompanionExecutableUnavailable",
    "WorkspaceUntrusted",
    "DirectoryOpenNotAllowed",
    "ActionNotAllowed",
  ];
  return precedence.find((code) => issues.some((issue) => issue.code === code)) ?? null;
}

function canonicalDirectory(value: string): string | null {
  const trimmed = value.trim();
  if (!trimmed || trimmed.length > 1024 || /[\r\n\0]/.test(trimmed) || !isAbsoluteDirectory(trimmed)) {
    return null;
  }
  if (trimmed.includes("%") || trimmed.toLowerCase().startsWith("shell:")) {
    return null;
  }
  if (/^\\\\wsl\$/i.test(trimmed)) {
    return parseWslUncPath(trimmed) ? trimmed : null;
  }
  if (trimmed.startsWith("\\\\") || trimmed.startsWith("\\\\.\\") || trimmed.startsWith("\\\\?\\")) {
    return null;
  }
  return trimmed;
}

function isLocalDirectory(directory: string): boolean {
  return /^[a-zA-Z]:[\\/]/.test(directory) && !directory.startsWith("\\\\") && !directory.includes("%");
}

function resolveExecutablePath(path: string): string | null {
  const trimmed = path.trim();
  if (!trimmed) {
    return null;
  }
  const candidate = isAbsolute(trimmed) ? trimmed : resolve(trimmed);
  return existsSync(candidate) ? candidate : null;
}

function isHttpUrl(value: string): boolean {
  const candidate = value.trim();
  return /^https?:\/\/[^/\s]+(?:\/[^\s]*)?$/i.test(candidate) && !/\s|%(?![0-9a-f]{2})/i.test(candidate);
}
