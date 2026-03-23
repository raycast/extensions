import { execFileSync } from "node:child_process";
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { homedir } from "node:os";
import { basename, dirname, join } from "node:path";

type CodexState = {
  "active-workspace-roots"?: string[];
};

export type XcodeRunSession = {
  targetPath: string;
  actionResultId: string;
  previousActionResultId: string;
};

export type XcodeRunState = "building" | "succeeded" | "failed" | "cancelled" | "unknown";

export type ObserveWorkspaceRunResult = {
  state: XcodeRunState;
};

export type XcodeTargetKind = "workspace" | "project" | "package";

export type XcodeTargetResolution = {
  targetPath: string;
  targetKind: XcodeTargetKind;
  xcodeAppPath?: string;
  xedPath?: string;
};

export const CODEX_APP_ID = "com.openai.codex";
export const XCODE_APP_ID = "com.apple.dt.Xcode";
const APPLESCRIPT_FIELD_SEPARATOR = "\u001f";
const BUILD_LOG_TAIL_LENGTH = 2048;
const RUN_START_POLL_ATTEMPTS = 25;
const RUN_START_POLL_INTERVAL_SECONDS = 0.2;
const RUN_STATUS_POLL_ATTEMPTS = 300;
const RUN_STATUS_POLL_INTERVAL_SECONDS = 0.2;

export class UserFacingError extends Error {
  title: string;
  detail?: string;

  constructor(title: string, detail?: string) {
    super(detail ?? title);
    this.name = "UserFacingError";
    this.title = title;
    this.detail = detail;
  }
}

export function workspaceLabel(path: string) {
  return `${basename(dirname(path))}/${basename(path)}`;
}

function codexStateFilePath() {
  return join(process.env.CODEX_HOME ?? join(homedir(), ".codex"), ".codex-global-state.json");
}

function runAppleScript(script: string, args: string[] = []) {
  return execFileSync("/usr/bin/osascript", ["-", ...args], {
    encoding: "utf8",
    input: script,
    maxBuffer: 1024 * 1024,
  }).trim();
}

function runCommand(command: string, args: string[]) {
  execFileSync(command, args, {
    encoding: "utf8",
    maxBuffer: 1024 * 1024,
  });
}

function commandFailureDetail(error: unknown) {
  if (!(error instanceof Error)) {
    return undefined;
  }

  const stderr = (error as { stderr?: string | Buffer }).stderr;
  if (typeof stderr === "string" && stderr.trim()) {
    return stderr.trim();
  }

  if (Buffer.isBuffer(stderr)) {
    const detail = stderr.toString("utf8").trim();
    if (detail) {
      return detail;
    }
  }

  return error.message.trim() || undefined;
}

function readDirectoryEntries(path: string) {
  try {
    return readdirSync(path).sort((left, right) => left.localeCompare(right));
  } catch {
    return [];
  }
}

function resolveXcodeInstallation() {
  let xedPath: string | undefined;
  let xcodeAppPath: string | undefined;

  try {
    const developerPath = execFileSync("/usr/bin/xcode-select", ["-p"], {
      encoding: "utf8",
      maxBuffer: 1024 * 1024,
      timeout: 1000,
    }).trim();

    if (developerPath) {
      const selectedXedPath = join(developerPath, "usr", "bin", "xed");
      if (existsSync(selectedXedPath)) {
        xedPath = selectedXedPath;
      }

      const candidateAppPath = developerPath.endsWith("/Contents/Developer")
        ? developerPath.slice(0, -"/Contents/Developer".length)
        : undefined;

      if (candidateAppPath && existsSync(candidateAppPath)) {
        xcodeAppPath = candidateAppPath;
      }
    }
  } catch {
    // Fall through to bundle discovery.
  }

  if (!xcodeAppPath) {
    const applicationRoots = ["/Applications", join(homedir(), "Applications")];

    for (const applicationRoot of applicationRoots) {
      const entries = readDirectoryEntries(applicationRoot);
      const bundleName = entries.find((entry) => entry.startsWith("Xcode") && entry.endsWith(".app"));

      if (!bundleName) {
        continue;
      }

      const candidateAppPath = join(applicationRoot, bundleName);
      if (existsSync(candidateAppPath)) {
        xcodeAppPath = candidateAppPath;
        break;
      }
    }
  }

  if (!xedPath && xcodeAppPath) {
    const bundledXedPath = join(xcodeAppPath, "Contents", "Developer", "usr", "bin", "xed");
    if (existsSync(bundledXedPath)) {
      xedPath = bundledXedPath;
    }
  }

  return {
    xcodeAppPath,
    xedPath,
  };
}

function resolveNearestXcodeTarget(startPath: string) {
  let searchPath = startPath;

  if (!existsSync(searchPath) || !statSync(searchPath).isDirectory()) {
    searchPath = dirname(searchPath);
  }

  for (;;) {
    const entries = readDirectoryEntries(searchPath);

    const workspaceName = entries.find((entry) => entry.endsWith(".xcworkspace"));
    if (workspaceName) {
      return {
        targetPath: join(searchPath, workspaceName),
        targetKind: "workspace" as const,
      };
    }

    const projectName = entries.find((entry) => entry.endsWith(".xcodeproj"));
    if (projectName) {
      return {
        targetPath: join(searchPath, projectName),
        targetKind: "project" as const,
      };
    }

    if (entries.includes("Package.swift")) {
      return {
        targetPath: searchPath,
        targetKind: "package" as const,
      };
    }

    const parentPath = dirname(searchPath);
    if (parentPath === searchPath) {
      return undefined;
    }

    searchPath = parentPath;
  }
}

function xcodeDocumentPath(target: XcodeTargetResolution) {
  if (target.targetKind === "package") {
    return join(target.targetPath, "Package.swift");
  }

  return target.targetPath;
}

function openTargetInXcode(target: XcodeTargetResolution) {
  if (target.xedPath) {
    runCommand(target.xedPath, ["--project", target.targetPath, xcodeDocumentPath(target)]);
    return;
  }

  if (target.xcodeAppPath) {
    runCommand("/usr/bin/open", ["-a", target.xcodeAppPath, target.targetPath]);
    return;
  }

  throw new UserFacingError("Couldn't locate Xcode");
}

export function restoreCodex() {
  try {
    runAppleScript(
      `
on codexIsFrontmost()
    try
        tell application "System Events"
            set frontmostProcess to first application process whose frontmost is true

            try
                return (bundle identifier of frontmostProcess as text) is "${CODEX_APP_ID}"
            on error
                return (name of frontmostProcess as text) is "Codex"
            end try
        end tell
    on error
        return false
    end try
end codexIsFrontmost

repeat 8 times
try
    tell application id "${CODEX_APP_ID}" to activate
end try

try
    tell application "Codex" to activate
end try

    delay 0.25

    if codexIsFrontmost() then
        return
    end if

try
    do shell script "/usr/bin/open -b " & quoted form of "${CODEX_APP_ID}"
end try

    delay 0.25

    if codexIsFrontmost() then
        return
    end if
end repeat
`,
    );
  } catch {
    // Best effort only.
  }
}

export function readFocusedRepoRoot() {
  let payload: CodexState;

  try {
    const rawState = readFileSync(codexStateFilePath(), "utf8");
    payload = JSON.parse(rawState) as CodexState;
  } catch {
    throw new UserFacingError(
      "Couldn't read the focused Codex repo",
      "Make sure the Codex desktop app is installed, then focus a repo in Codex and try again.",
    );
  }

  const repoRoot = payload["active-workspace-roots"]?.[0];

  if (!repoRoot) {
    throw new UserFacingError("No focused Codex repo found");
  }

  return repoRoot;
}

export function resolveXcodeTarget(repoRoot: string): XcodeTargetResolution {
  const target = resolveNearestXcodeTarget(repoRoot);

  if (!target) {
    throw new UserFacingError("No Xcode project found for this repo", basename(repoRoot));
  }

  return {
    ...target,
    ...resolveXcodeInstallation(),
  };
}

function startWorkspaceRun(target: XcodeTargetResolution) {
  const output = runAppleScript(
    `
on run argv
    set targetPath to item 1 of argv
    set hasReadyTarget to "false"
    set actionResultId to ""
    set previousActionResultId to ""
    set fieldSeparator to ASCII character 31

    tell application "Xcode" to activate

    repeat 120 times
        tell application id "${XCODE_APP_ID}"
            try
                set workspaceDocument to active workspace document
                if path of workspaceDocument is targetPath and loaded of workspaceDocument is true then
                    set hasReadyTarget to "true"
                    exit repeat
                end if
            end try
        end tell

        delay 0.25
    end repeat

    if hasReadyTarget is "false" then
        error "Xcode didn't activate the resolved project before running."
    end if

    tell application id "${XCODE_APP_ID}"
        set workspaceDocument to active workspace document

        if path of workspaceDocument is not targetPath then
            error "Xcode activated a different project than the resolved target."
        end if

        try
            set previousActionResult to last scheme action result of workspaceDocument
            set previousActionResultId to id of previousActionResult as text
        end try

        set actionResult to run workspaceDocument

        try
            set actionResultId to id of actionResult as text
        end try

        if actionResultId is "" then
            repeat ${RUN_START_POLL_ATTEMPTS} times
                try
                    set latestActionResult to last scheme action result of workspaceDocument
                    set latestActionResultId to id of latestActionResult as text

                    if latestActionResultId is not "" and latestActionResultId is not previousActionResultId then
                        set actionResultId to latestActionResultId
                        exit repeat
                    end if
                end try

                delay ${RUN_START_POLL_INTERVAL_SECONDS}
            end repeat
        end if
    end tell

    return previousActionResultId & fieldSeparator & actionResultId
end run
`,
    [target.targetPath],
  );

  const [previousActionResultId = "", actionResultId = ""] = output.split(APPLESCRIPT_FIELD_SEPARATOR);

  return {
    previousActionResultId: previousActionResultId.trim(),
    actionResultId: actionResultId.trim(),
  };
}

export function observeWorkspaceRunSession(session: XcodeRunSession): ObserveWorkspaceRunResult {
  const output = runAppleScript(
    `
on run argv
    set targetPath to item 1 of argv
    set actionResultId to item 2 of argv
    set previousActionResultId to item 3 of argv
    set observedState to "unknown"

    script runObserver
        on workspaceDocumentFor(targetPath)
            tell application id "${XCODE_APP_ID}"
                repeat with candidateDocument in workspace documents
                    try
                        if (path of candidateDocument as text) is targetPath then
                            return candidateDocument
                        end if
                    end try
                end repeat
            end tell

            return missing value
        end workspaceDocumentFor

        on buildLogTailFor(actionResult)
            set buildLogTail to ""

            tell application id "${XCODE_APP_ID}"
                try
                    set buildLogText to build log of actionResult as text

                    if buildLogText is not "" then
                        set buildLogLength to count buildLogText

                        if buildLogLength > ${BUILD_LOG_TAIL_LENGTH} then
                            set buildLogTail to text (buildLogLength - ${BUILD_LOG_TAIL_LENGTH - 1}) thru buildLogLength of buildLogText
                        else
                            set buildLogTail to buildLogText
                        end if
                    end if
                end try
            end tell

            return buildLogTail
        end buildLogTailFor

        on observedStateFor(actionResult)
            set actionStatus to ""
            set completedValue to "false"
            set buildErrorsCount to "0"
            set buildLogTail to my buildLogTailFor(actionResult)

            tell application id "${XCODE_APP_ID}"
                try
                    set actionStatus to status of actionResult as text
                end try

                try
                    set completedValue to completed of actionResult as text
                end try

                try
                    set buildErrorsCount to (count of (build errors of actionResult)) as text
                end try
            end tell

            if actionStatus is "cancelled" then
                return "cancelled"
            end if

            if actionStatus is "failed" or actionStatus is "error occurred" then
                return "failed"
            end if

            if completedValue is "true" and buildErrorsCount is not "0" then
                return "failed"
            end if

            if buildLogTail contains "BUILD FAILED" or buildLogTail contains "Build failed" then
                return "failed"
            end if

            -- Xcode keeps the run action in "running" while the debugger stays attached,
            -- so a successful build must also be inferred from the build log tail.
            if (completedValue is "true" and buildErrorsCount is "0") or actionStatus is "succeeded" or buildLogTail contains "BUILD SUCCEEDED" or buildLogTail contains "Build succeeded" then
                return "succeeded"
            end if

            if actionStatus is "running" or actionStatus is "not yet started" or actionStatus is "" then
                return "building"
            end if

            return "unknown"
        end observedStateFor

        on matchingActionResultFor(workspaceDocument, actionResultId)
            if workspaceDocument is missing value or actionResultId is "" then
                return missing value
            end if

            tell application id "${XCODE_APP_ID}"
                try
                    repeat with candidateActionResult in scheme action results of workspaceDocument
                        try
                            if (id of candidateActionResult as text) is actionResultId then
                                return candidateActionResult
                            end if
                        end try
                    end repeat
                end try
            end tell

            return missing value
        end matchingActionResultFor

        on latestStartedActionResultFor(workspaceDocument, actionResultId, previousActionResultId)
            if workspaceDocument is missing value then
                return missing value
            end if

            tell application id "${XCODE_APP_ID}"
                try
                    set latestActionResult to last scheme action result of workspaceDocument
                    set latestActionResultId to id of latestActionResult as text

                    if latestActionResultId is "" then
                        return missing value
                    end if

                    if actionResultId is not "" and latestActionResultId is actionResultId then
                        return latestActionResult
                    end if

                    if previousActionResultId is not "" and latestActionResultId is previousActionResultId then
                        return missing value
                    end if

                    return latestActionResult
                end try
            end tell

            return missing value
        end latestStartedActionResultFor

        on actionResultFor(targetPath, actionResultId, previousActionResultId)
            set targetDocument to my workspaceDocumentFor(targetPath)

            if targetDocument is not missing value then
                set matchingActionResult to my matchingActionResultFor(targetDocument, actionResultId)
                if matchingActionResult is not missing value then
                    return matchingActionResult
                end if

                set latestActionResult to my latestStartedActionResultFor(targetDocument, actionResultId, previousActionResultId)
                if latestActionResult is not missing value then
                    return latestActionResult
                end if
            end if

            if actionResultId is "" then
                return missing value
            end if

            tell application id "${XCODE_APP_ID}"
                repeat with candidateDocument in workspace documents
                    try
                        repeat with candidateActionResult in scheme action results of candidateDocument
                            try
                                if (id of candidateActionResult as text) is actionResultId then
                                    return candidateActionResult
                                end if
                            end try
                        end repeat
                    end try
                end repeat
            end tell

            return missing value
        end actionResultFor
    end script

    if actionResultId is "" then
        return observedState
    end if

    repeat ${RUN_STATUS_POLL_ATTEMPTS} times
        set actionResult to runObserver's actionResultFor(targetPath, actionResultId, previousActionResultId)

        if actionResult is not missing value then
            set observedState to runObserver's observedStateFor(actionResult)

            if observedState is not "building" then
                return observedState
            end if
        end if

        delay ${RUN_STATUS_POLL_INTERVAL_SECONDS}
    end repeat

    return observedState
end run
`,
    [session.targetPath, session.actionResultId, session.previousActionResultId],
  );

  return {
    state: (output.trim() || "unknown") as XcodeRunState,
  };
}

export function startWorkspaceRunSession(target: XcodeTargetResolution): XcodeRunSession {
  openTargetInXcode(target);

  let startedRun: ReturnType<typeof startWorkspaceRun>;

  try {
    startedRun = startWorkspaceRun(target);
  } catch (error) {
    throw new UserFacingError("Couldn't start the Xcode run", commandFailureDetail(error));
  }

  return {
    targetPath: target.targetPath,
    actionResultId: startedRun.actionResultId,
    previousActionResultId: startedRun.previousActionResultId,
  };
}
