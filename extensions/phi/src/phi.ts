import { getPreferenceValues } from "@raycast/api";
import { runAppleScript } from "@raycast/utils";
import { serializePhiInvocationContext } from "./invocation-context";
import {
  ApplicationChannel,
  PHI_API_VERSION,
  PhiError,
  PhiSpace,
  PhiTab,
  PhiTabSearchResults,
  PhiVersion,
  parseAcknowledgement,
  parseChromiumDataDirectoryResponse,
  parseSpacesResponse,
  parseTabsResponse,
  parseVersionResponse,
} from "./types";

const APPLE_SCRIPT_TIMEOUT_MS = 5_000;
const APPLE_SCRIPT_PERMISSION_TIMEOUT_MS = 30_000;
const PHI_NOT_RUNNING_RESULT = "__PHI_NOT_RUNNING__";
export const MINIMUM_PHI_VERSION = "2.4.0";

function updatePhiMessage(minimumVersion: string): string {
  return `Phi ${minimumVersion} or later is required. Update Phi and try again.`;
}

type AppleScriptOptions = { timeout: number; humanReadableOutput: boolean };
export type AppleScriptRunner = (
  script: string,
  args: string[],
  options: AppleScriptOptions,
) => Promise<string>;

export type TabScope =
  { kind: "all" } | { kind: "current" } | { kind: "space"; spaceId: string };

function applicationId(channel: ApplicationChannel): string {
  return channel === "stable"
    ? "com.phibrowser.Mac"
    : "com.phibrowser.canary.Mac";
}

function applicationName(channel: ApplicationChannel): string {
  return channel === "stable" ? "Phi" : "Phi Canary";
}

function script(channel: ApplicationChannel, body: string): string {
  const target = applicationId(channel);
  return `on run argv
${body
  .replaceAll("__PHI_APPLICATION_ID__", target)
  .replaceAll("__PHI_APPLICATION_NAME__", applicationName(channel))}
end run`;
}

function commandScript(
  channel: ApplicationChannel,
  argumentCount: number,
  body: string,
): string {
  return script(
    channel,
    `  set requestedClientContext to item ${argumentCount + 1} of argv
${body}`,
  );
}

export function parseApplicationChannel(value: unknown): ApplicationChannel {
  if (value === "stable" || value === "canary") {
    return value;
  }
  throw new PhiError(
    "invalidArgument",
    "Choose either Phi or Phi Canary in extension preferences.",
  );
}

function commandScripts(channel: ApplicationChannel) {
  return {
    isRunning: script(
      channel,
      '  return application "__PHI_APPLICATION_NAME__" is running',
    ),
    getVersion: commandScript(
      channel,
      0,
      '  tell application id "__PHI_APPLICATION_ID__" to get scripting version client context requestedClientContext',
    ),
    getChromiumDataDirectory: commandScript(
      channel,
      0,
      `  if application "__PHI_APPLICATION_NAME__" is not running then
    return "${PHI_NOT_RUNNING_RESULT}"
  end if
  tell application id "__PHI_APPLICATION_ID__" to get chromium data directory client context requestedClientContext`,
    ),
    listSpaces: commandScript(
      channel,
      0,
      '  tell application id "__PHI_APPLICATION_ID__" to list spaces client context requestedClientContext',
    ),
    listTabs: commandScript(
      channel,
      2,
      `  set requestedScope to item 1 of argv
  set requestedSpaceId to item 2 of argv
  if requestedSpaceId is "" then
    tell application id "__PHI_APPLICATION_ID__" to list tabs scope requestedScope client context requestedClientContext
  else
    tell application id "__PHI_APPLICATION_ID__" to list tabs scope requestedScope space id requestedSpaceId client context requestedClientContext
  end if`,
    ),
    activateSpace: commandScript(
      channel,
      1,
      `  set requestedSpaceId to item 1 of argv
  tell application id "__PHI_APPLICATION_ID__"
    reopen
    activate
    activate space space id requestedSpaceId client context requestedClientContext
  end tell`,
    ),
    activateTab: commandScript(
      channel,
      2,
      `  set requestedWindowId to item 1 of argv
  set requestedTabId to item 2 of argv
  tell application id "__PHI_APPLICATION_ID__" to activate tab window id requestedWindowId tab id requestedTabId client context requestedClientContext`,
    ),
    closeTab: commandScript(
      channel,
      2,
      `  set requestedWindowId to item 1 of argv
  set requestedTabId to item 2 of argv
  tell application id "__PHI_APPLICATION_ID__" to close tab window id requestedWindowId tab id requestedTabId client context requestedClientContext`,
    ),
    reloadTab: commandScript(
      channel,
      2,
      `  set requestedWindowId to item 1 of argv
  set requestedTabId to item 2 of argv
  tell application id "__PHI_APPLICATION_ID__" to reload tab window id requestedWindowId tab id requestedTabId client context requestedClientContext`,
    ),
    forceReloadTab: commandScript(
      channel,
      2,
      `  set requestedWindowId to item 1 of argv
  set requestedTabId to item 2 of argv
  tell application id "__PHI_APPLICATION_ID__" to force reload tab window id requestedWindowId tab id requestedTabId client context requestedClientContext`,
    ),
    addSplitView: commandScript(
      channel,
      2,
      `  set requestedWindowId to item 1 of argv
  set requestedTabId to item 2 of argv
  tell application id "__PHI_APPLICATION_ID__" to add split view window id requestedWindowId tab id requestedTabId client context requestedClientContext`,
    ),
    openPinnedTab: commandScript(
      channel,
      2,
      `  set requestedSpaceId to item 1 of argv
  set requestedPinnedTabId to item 2 of argv
  tell application id "__PHI_APPLICATION_ID__" to open pinned tab space id requestedSpaceId pinned tab id requestedPinnedTabId client context requestedClientContext`,
    ),
    openBookmark: commandScript(
      channel,
      2,
      `  set requestedSpaceId to item 1 of argv
  set requestedBookmarkId to item 2 of argv
  tell application id "__PHI_APPLICATION_ID__" to open bookmark space id requestedSpaceId bookmark id requestedBookmarkId client context requestedClientContext`,
    ),
    openTab: commandScript(
      channel,
      2,
      `  set requestedAddress to item 1 of argv
  set requestedSpaceId to item 2 of argv
  if requestedSpaceId is "" then
    tell application id "__PHI_APPLICATION_ID__" to open tab address requestedAddress client context requestedClientContext
  else
    tell application id "__PHI_APPLICATION_ID__" to open tab address requestedAddress space id requestedSpaceId client context requestedClientContext
  end if`,
    ),
    newWindow: commandScript(
      channel,
      0,
      '  tell application id "__PHI_APPLICATION_ID__" to create phi window client context requestedClientContext',
    ),
    newIncognitoWindow: commandScript(
      channel,
      0,
      '  tell application id "__PHI_APPLICATION_ID__" to create phi incognito window client context requestedClientContext',
    ),
  };
}

function versionComponents(version: string): number[] | undefined {
  const components = version.split(".");
  if (
    components.length === 0 ||
    components.length > 3 ||
    components.some((component) => !/^\d+$/.test(component))
  ) {
    return undefined;
  }

  const parsed = components.map(Number);
  return parsed.every(Number.isSafeInteger) ? parsed : undefined;
}

function isVersionAtLeast(version: string, minimumVersion: string): boolean {
  const current = versionComponents(version);
  const minimum = versionComponents(minimumVersion);
  if (!current || !minimum) {
    throw new PhiError(
      "malformedResponse",
      "Phi returned an invalid application version.",
    );
  }

  for (let index = 0; index < 3; index += 1) {
    const difference = (current[index] ?? 0) - (minimum[index] ?? 0);
    if (difference !== 0) {
      return difference > 0;
    }
  }
  return true;
}

export class PhiClient {
  private compatibilityCheck?: Promise<PhiVersion>;

  constructor(
    private readonly runner: AppleScriptRunner,
    private readonly channel: ApplicationChannel,
  ) {}

  async getVersion(): Promise<PhiVersion> {
    const raw = await this.execute(
      commandScripts(this.channel).getVersion,
      [],
      APPLE_SCRIPT_PERMISSION_TIMEOUT_MS,
    );
    return parseVersionResponse(raw);
  }

  async getChromiumDataDirectoryIfRunning(): Promise<string | undefined> {
    let runningResponse: string;
    try {
      runningResponse = await this.execute(
        commandScripts(this.channel).isRunning,
        [],
      );
    } catch (error) {
      if (error instanceof PhiError && error.kind === "unavailable") {
        return undefined;
      }
      throw error;
    }

    const isRunning = runningResponse.trim().toLowerCase();
    if (isRunning === "false") {
      return undefined;
    }
    if (isRunning !== "true") {
      throw new PhiError(
        "malformedResponse",
        "macOS returned an invalid Phi running state.",
      );
    }

    let raw: string;
    try {
      raw = await this.execute(
        commandScripts(this.channel).getChromiumDataDirectory,
        [],
        APPLE_SCRIPT_PERMISSION_TIMEOUT_MS,
      );
    } catch (error) {
      if (
        error instanceof PhiError &&
        (error.kind === "minimumVersionNotMet" ||
          error.kind === "unsupportedVersion")
      ) {
        return undefined;
      }
      throw error;
    }

    return raw.trim() === PHI_NOT_RUNNING_RESULT
      ? undefined
      : parseChromiumDataDirectoryResponse(raw);
  }

  requireVersion(
    minimumVersion: string = MINIMUM_PHI_VERSION,
  ): Promise<PhiVersion> {
    return this.ensureCompatible(minimumVersion);
  }

  async getSpaces(): Promise<PhiSpace[]> {
    await this.ensureCompatible();
    return parseSpacesResponse(
      await this.execute(commandScripts(this.channel).listSpaces, []),
    );
  }

  async getTabs(
    scope: TabScope = { kind: "all" },
  ): Promise<PhiTabSearchResults> {
    await this.ensureCompatible();
    const spaceId = scope.kind === "space" ? scope.spaceId : "";
    return parseTabsResponse(
      await this.execute(commandScripts(this.channel).listTabs, [
        scope.kind,
        spaceId,
      ]),
    );
  }

  async activateSpace(spaceId: string): Promise<void> {
    await this.ensureCompatible();
    parseAcknowledgement(
      await this.execute(commandScripts(this.channel).activateSpace, [spaceId]),
    );
  }

  async activateTab(tab: Pick<PhiTab, "windowId" | "id">): Promise<void> {
    await this.ensureCompatible();
    parseAcknowledgement(
      await this.execute(commandScripts(this.channel).activateTab, [
        tab.windowId,
        tab.id,
      ]),
    );
  }

  async closeTab(tab: Pick<PhiTab, "windowId" | "id">): Promise<void> {
    await this.ensureCompatible();
    parseAcknowledgement(
      await this.execute(commandScripts(this.channel).closeTab, [
        tab.windowId,
        tab.id,
      ]),
    );
  }

  async reloadTab(tab: Pick<PhiTab, "windowId" | "id">): Promise<void> {
    await this.ensureCompatible();
    parseAcknowledgement(
      await this.execute(commandScripts(this.channel).reloadTab, [
        tab.windowId,
        tab.id,
      ]),
    );
  }

  async forceReloadTab(tab: Pick<PhiTab, "windowId" | "id">): Promise<void> {
    await this.ensureCompatible();
    parseAcknowledgement(
      await this.execute(commandScripts(this.channel).forceReloadTab, [
        tab.windowId,
        tab.id,
      ]),
    );
  }

  async addSplitView(tab: Pick<PhiTab, "windowId" | "id">): Promise<void> {
    await this.ensureCompatible();
    parseAcknowledgement(
      await this.execute(commandScripts(this.channel).addSplitView, [
        tab.windowId,
        tab.id,
      ]),
    );
  }

  async openPinnedTab(spaceId: string, pinnedTabId: string): Promise<void> {
    await this.ensureCompatible();
    parseAcknowledgement(
      await this.execute(commandScripts(this.channel).openPinnedTab, [
        spaceId,
        pinnedTabId,
      ]),
    );
  }

  async openBookmark(spaceId: string, bookmarkId: string): Promise<void> {
    await this.ensureCompatible();
    parseAcknowledgement(
      await this.execute(commandScripts(this.channel).openBookmark, [
        spaceId,
        bookmarkId,
      ]),
    );
  }

  async openTab(address: string, spaceId?: string): Promise<void> {
    await this.ensureCompatible();
    parseAcknowledgement(
      await this.execute(commandScripts(this.channel).openTab, [
        address,
        spaceId ?? "",
      ]),
    );
  }

  async newWindow(): Promise<void> {
    await this.ensureCompatible();
    parseAcknowledgement(
      await this.execute(commandScripts(this.channel).newWindow, []),
    );
  }

  async newIncognitoWindow(): Promise<void> {
    await this.ensureCompatible();
    parseAcknowledgement(
      await this.execute(commandScripts(this.channel).newIncognitoWindow, []),
    );
  }

  private ensureCompatible(
    minimumVersion: string = MINIMUM_PHI_VERSION,
  ): Promise<PhiVersion> {
    if (!this.compatibilityCheck) {
      this.compatibilityCheck = this.getVersion().catch((error: unknown) => {
        this.compatibilityCheck = undefined;
        throw error;
      });
    }
    return this.compatibilityCheck.then((version) => {
      try {
        if (
          this.channel === "stable" &&
          !isVersionAtLeast(version.version, minimumVersion)
        ) {
          throw new PhiError(
            "minimumVersionNotMet",
            updatePhiMessage(minimumVersion),
          );
        }
        if (version.apiVersion < PHI_API_VERSION) {
          throw new PhiError(
            "unsupportedVersion",
            "Update Phi to a version that supports scripting API version 1.",
          );
        }
        return version;
      } catch (error) {
        this.compatibilityCheck = undefined;
        throw error;
      }
    });
  }

  private async execute(
    command: string,
    args: string[],
    timeout = APPLE_SCRIPT_TIMEOUT_MS,
  ): Promise<string> {
    try {
      return await this.runner(
        command,
        [...args, serializePhiInvocationContext()],
        {
          timeout,
          humanReadableOutput: true,
        },
      );
    } catch (error) {
      throw classifyAppleScriptError(error, this.channel);
    }
  }
}

export function classifyAppleScriptError(
  error: unknown,
  channel: ApplicationChannel = "stable",
): PhiError {
  if (error instanceof PhiError) {
    return error;
  }
  const message = error instanceof Error ? error.message : String(error);
  const normalized = message.toLowerCase();

  if (
    normalized.includes("-1743") ||
    normalized.includes("not authorized to send apple events")
  ) {
    return new PhiError(
      "permissionDenied",
      "Allow Raycast to automate Phi in System Settings > Privacy & Security > Automation.",
      error,
    );
  }
  if (
    normalized.includes("timed out") ||
    normalized.includes("timeout") ||
    normalized.includes("sigterm") ||
    normalized.includes("aborted")
  ) {
    return new PhiError(
      "timeout",
      "Phi did not respond in time. Try again.",
      error,
    );
  }
  if (
    normalized.includes("application isn't running") ||
    normalized.includes("application isn’t running") ||
    normalized.includes("application not found") ||
    normalized.includes("-600") ||
    normalized.includes("-10814")
  ) {
    return new PhiError(
      "unavailable",
      "Phi is not installed or could not be launched.",
      error,
    );
  }
  if (
    normalized.includes("doesn’t understand") ||
    normalized.includes("doesn't understand") ||
    normalized.includes("expected end of line") ||
    normalized.includes("-1708")
  ) {
    if (channel === "canary") {
      return new PhiError(
        "unsupportedVersion",
        "Update Phi Canary to a build that supports Raycast integration.",
        error,
      );
    }
    return new PhiError(
      "minimumVersionNotMet",
      updatePhiMessage(MINIMUM_PHI_VERSION),
      error,
    );
  }
  return new PhiError(
    "unknown",
    "Raycast could not communicate with Phi.",
    error,
  );
}

let defaultClient: PhiClient | undefined;

function client(): PhiClient {
  if (!defaultClient) {
    const preferences = getPreferenceValues<Preferences>();
    const channel = parseApplicationChannel(preferences.applicationChannel);
    defaultClient = new PhiClient(runAppleScript, channel);
  }
  return defaultClient;
}

export const getSpaces = () => client().getSpaces();
export const getChromiumDataDirectoryIfRunning = () =>
  client().getChromiumDataDirectoryIfRunning();
export const requirePhiVersion = (minimumVersion: string) =>
  client().requireVersion(minimumVersion);
export const getTabs = (scope?: TabScope) => client().getTabs(scope);
export const activateSpace = (spaceId: string) =>
  client().activateSpace(spaceId);
export const activateTab = (tab: Pick<PhiTab, "windowId" | "id">) =>
  client().activateTab(tab);
export const closeTab = (tab: Pick<PhiTab, "windowId" | "id">) =>
  client().closeTab(tab);
export const reloadTab = (tab: Pick<PhiTab, "windowId" | "id">) =>
  client().reloadTab(tab);
export const forceReloadTab = (tab: Pick<PhiTab, "windowId" | "id">) =>
  client().forceReloadTab(tab);
export const addSplitView = (tab: Pick<PhiTab, "windowId" | "id">) =>
  client().addSplitView(tab);
export const openPinnedTab = (spaceId: string, pinnedTabId: string) =>
  client().openPinnedTab(spaceId, pinnedTabId);
export const openBookmark = (spaceId: string, bookmarkId: string) =>
  client().openBookmark(spaceId, bookmarkId);
export const openTab = (address: string, spaceId?: string) =>
  client().openTab(address, spaceId);
export const newWindow = () => client().newWindow();
export const newIncognitoWindow = () => client().newIncognitoWindow();
