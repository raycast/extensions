import {
  Action,
  ActionPanel,
  Cache,
  closeMainWindow,
  getPreferenceValues,
  Icon,
  Keyboard,
  List,
  open,
  openExtensionPreferences,
  showHUD,
  showToast,
  Toast,
} from "@raycast/api";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ApplicationsResponse,
  executeCommand,
  FastNavCommand,
  getRunningApplications,
  requestAccessibilityPermission,
  RunningApplication,
  scanInterfaceCommands,
  scanMenuCommands,
} from "./bridge";
import { rankCommands } from "./fuzzy";
import { collapseSharedSystemCommands } from "./system-command-filter";
import { loadUsage, recordUsage, UsageMap } from "./usage";

const accessibilitySettingsURL =
  "x-apple.systempreferences:com.apple.preference.security?Privacy_Accessibility";
const commandCache = new Cache({ namespace: "actions-v5" });
const startupCache = new Cache({ namespace: "startup-v3" });
const allApplicationsScope = "all";
const focusedApplicationScope = "focused";
const maximumConcurrentApplicationScans = 4;

interface ApplicationScanResult {
  application: RunningApplication;
  menuResult: PromiseSettledResult<FastNavCommand[]>;
  interfaceResult: PromiseSettledResult<FastNavCommand[]>;
}

interface FastNavPreferences {
  searchAllApplications: boolean;
  includeInterfaceElements: boolean;
}

interface StartupSnapshot {
  applications: RunningApplication[];
  commands: FastNavCommand[];
}

function startupCacheKey(includesInterface: boolean): string {
  return includesInterface ? "all" : "menu";
}

function readStartupSnapshot(
  includesInterface: boolean,
): StartupSnapshot | undefined {
  const cached = startupCache.get(startupCacheKey(includesInterface));
  if (!cached) return undefined;

  try {
    const snapshot = JSON.parse(cached) as StartupSnapshot;
    if (
      !Array.isArray(snapshot.applications) ||
      !Array.isArray(snapshot.commands)
    ) {
      return undefined;
    }
    return snapshot;
  } catch {
    return undefined;
  }
}

function writeStartupSnapshot(
  applicationState: ApplicationsResponse,
  commands: FastNavCommand[],
  includesInterface: boolean,
) {
  startupCache.set(
    startupCacheKey(includesInterface),
    JSON.stringify({
      applications: applicationState.applications,
      commands,
    } satisfies StartupSnapshot),
  );
}

function cacheKey(
  application: RunningApplication,
  includesInterface: boolean,
): string {
  return `${includesInterface ? "all" : "menu"}:${application.bundleIdentifier ?? application.name}`;
}

function readCachedCommands(
  application: RunningApplication,
  includesInterface: boolean,
): FastNavCommand[] {
  const cached = commandCache.get(cacheKey(application, includesInterface));
  if (!cached) return [];

  try {
    const commands = JSON.parse(cached) as FastNavCommand[];
    if (!Array.isArray(commands)) return [];
    return deduplicateCommands(
      commands
        // Interface locators are intentionally scoped to one app process. A
        // restarted app needs a live scan before its cached controls are safe
        // to run; menu commands still use their exact semantic identity.
        .filter(
          (command) =>
            command.source !== "interface" || command.pid === application.pid,
        )
        .map((command) => ({
          ...command,
          id: command.accessibilityLocator
            ? [
                application.bundleIdentifier ?? String(application.pid),
                `interface:${command.role ?? ""}`,
                command.accessibilityLocator,
                command.action,
              ].join("|")
            : [
                application.bundleIdentifier ?? String(application.pid),
                command.source === "menu"
                  ? "menu"
                  : `interface:${command.role ?? ""}`,
                command.menuPath.join(" › "),
                command.title,
                command.order,
              ].join("|"),
          pid: application.pid,
          appName: application.name,
          bundleIdentifier: application.bundleIdentifier,
        })),
    );
  } catch {
    return [];
  }
}

function deduplicateCommands(commands: FastNavCommand[]): FastNavCommand[] {
  const commandsByID = new Map<string, FastNavCommand>();
  for (const command of commands) commandsByID.set(command.id, command);
  return [...commandsByID.values()];
}

function replaceSource(
  current: FastNavCommand[],
  replacement: FastNavCommand[],
  pid: number,
  source: FastNavCommand["source"],
): FastNavCommand[] {
  return deduplicateCommands([
    ...current.filter(
      (command) => command.pid !== pid || command.source !== source,
    ),
    ...replacement,
  ]);
}

function applicationIcon(application: RunningApplication) {
  return application.path ? { fileIcon: application.path } : Icon.AppWindow;
}

function applicationForCommand(
  applications: RunningApplication[],
  command: FastNavCommand,
): RunningApplication | undefined {
  if (command.bundleIdentifier) {
    return applications.find(
      (application) =>
        application.bundleIdentifier === command.bundleIdentifier,
    );
  }

  return (
    applications.find(
      (application) =>
        application.pid === command.pid && application.name === command.appName,
    ) ??
    applications.find((application) => application.name === command.appName)
  );
}

async function getCurrentApplicationState(): Promise<ApplicationsResponse> {
  return getRunningApplications();
}

export default function SearchAppActions() {
  const preferences = getPreferenceValues<FastNavPreferences>();
  const [startupSnapshot] = useState(() =>
    preferences.searchAllApplications
      ? readStartupSnapshot(preferences.includeInterfaceElements)
      : undefined,
  );
  const [applicationState, setApplicationState] =
    useState<ApplicationsResponse>();
  const [focusedApplicationPID, setFocusedApplicationPID] = useState<number>();
  const [applicationScope, setApplicationScope] = useState(() =>
    preferences.searchAllApplications
      ? allApplicationsScope
      : focusedApplicationScope,
  );
  const [commands, setCommands] = useState<FastNavCommand[]>(
    () => startupSnapshot?.commands ?? [],
  );
  const [usage, setUsage] = useState<UsageMap>({});
  const [searchText, setSearchText] = useState("");
  const [selectedItemID, setSelectedItemID] = useState<string>();
  const [isLoadingApplications, setIsLoadingApplications] = useState(true);
  const [isLoadingCommands, setIsLoadingCommands] = useState(false);
  const [error, setError] = useState<string>();
  const scanRevision = useRef(0);
  const commandsRef = useRef(commands);

  const refreshApplications = useCallback(async () => {
    setIsLoadingApplications(true);
    setError(undefined);
    try {
      const response = await getCurrentApplicationState();
      setFocusedApplicationPID(response.defaultPid);
      setApplicationState(response);
      setApplicationScope((currentScope) => {
        const focusedPID = response.defaultPid ?? response.applications[0]?.pid;
        const focusedScope = focusedPID
          ? String(focusedPID)
          : focusedApplicationScope;
        if (
          currentScope === focusedApplicationScope ||
          (!preferences.searchAllApplications &&
            currentScope === allApplicationsScope)
        ) {
          return focusedScope;
        }
        if (currentScope === allApplicationsScope) return currentScope;
        return response.applications.some(
          (application) => String(application.pid) === currentScope,
        )
          ? currentScope
          : preferences.searchAllApplications
            ? allApplicationsScope
            : focusedScope;
      });
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : String(caughtError),
      );
    } finally {
      setIsLoadingApplications(false);
    }
  }, [preferences.searchAllApplications]);

  const refreshCommands = useCallback(async () => {
    const revision = scanRevision.current + 1;
    scanRevision.current = revision;
    const currentApplicationState = applicationState;
    // Keep the startup snapshot visible while the live application list is
    // still loading. Clearing it here makes the list disappear and then
    // reappear as soon as refreshApplications finishes.
    if (!currentApplicationState) return;

    const targetApplications =
      applicationScope === allApplicationsScope
        ? currentApplicationState.applications
        : currentApplicationState.applications.filter(
            (application) => String(application.pid) === applicationScope,
          );
    if (!targetApplications.length || !currentApplicationState.trusted) {
      commandsRef.current = [];
      setCommands([]);
      setIsLoadingCommands(false);
      return;
    }
    const scanningApplicationState: ApplicationsResponse =
      currentApplicationState;

    const cachedCommandsByPID = new Map(
      targetApplications.map((application) => [
        application.pid,
        readCachedCommands(application, preferences.includeInterfaceElements),
      ]),
    );
    const cachedCommands = [...cachedCommandsByPID.values()].flat();
    commandsRef.current = cachedCommands;
    setCommands(cachedCommands);
    if (applicationScope === allApplicationsScope) {
      writeStartupSnapshot(
        scanningApplicationState,
        cachedCommands,
        preferences.includeInterfaceElements,
      );
    }
    setIsLoadingCommands(true);
    setError(undefined);

    async function scanApplication(
      application: RunningApplication,
    ): Promise<ApplicationScanResult> {
      const menuRequest = scanMenuCommands(application.pid);
      const interfaceRequest = preferences.includeInterfaceElements
        ? scanInterfaceCommands(application.pid)
        : Promise.resolve([] as FastNavCommand[]);

      void menuRequest.then(
        (menuCommands) => {
          if (scanRevision.current !== revision) return;
          const nextCommands = replaceSource(
            commandsRef.current,
            menuCommands,
            application.pid,
            "menu",
          );
          commandsRef.current = nextCommands;
          setCommands(nextCommands);
          commandCache.set(
            cacheKey(application, preferences.includeInterfaceElements),
            JSON.stringify(
              nextCommands.filter((command) => command.pid === application.pid),
            ),
          );
          if (
            applicationScope === allApplicationsScope &&
            application.pid === scanningApplicationState.defaultPid
          ) {
            writeStartupSnapshot(
              scanningApplicationState,
              nextCommands,
              preferences.includeInterfaceElements,
            );
          }
        },
        () => undefined,
      );
      void interfaceRequest.then(
        (interfaceCommands) => {
          if (scanRevision.current !== revision) return;
          const nextCommands = replaceSource(
            commandsRef.current,
            interfaceCommands,
            application.pid,
            "interface",
          );
          commandsRef.current = nextCommands;
          setCommands(nextCommands);
          commandCache.set(
            cacheKey(application, preferences.includeInterfaceElements),
            JSON.stringify(
              nextCommands.filter((command) => command.pid === application.pid),
            ),
          );
        },
        () => undefined,
      );

      const [menuResult, interfaceResult] = await Promise.allSettled([
        menuRequest,
        interfaceRequest,
      ]);
      return { application, menuResult, interfaceResult };
    }

    const scanResults: ApplicationScanResult[] = [];
    for (
      let index = 0;
      index < targetApplications.length;
      index += maximumConcurrentApplicationScans
    ) {
      const batch = targetApplications.slice(
        index,
        index + maximumConcurrentApplicationScans,
      );
      scanResults.push(...(await Promise.all(batch.map(scanApplication))));
      if (scanRevision.current !== revision) return;
    }

    let successfulScans = 0;
    const failures: unknown[] = [];
    const nextCommands = deduplicateCommands(
      scanResults.flatMap(({ application, menuResult, interfaceResult }) => {
        const cachedApplicationCommands =
          cachedCommandsByPID.get(application.pid) ?? [];
        const menuCommands =
          menuResult.status === "fulfilled"
            ? menuResult.value
            : cachedApplicationCommands.filter(
                (command) => command.source === "menu",
              );
        const interfaceCommands = preferences.includeInterfaceElements
          ? interfaceResult.status === "fulfilled"
            ? interfaceResult.value
            : cachedApplicationCommands.filter(
                (command) => command.source === "interface",
              )
          : [];
        const applicationCommands = deduplicateCommands([
          ...menuCommands,
          ...interfaceCommands,
        ]);

        if (menuResult.status === "fulfilled") successfulScans += 1;
        else failures.push(menuResult.reason);
        if (preferences.includeInterfaceElements) {
          if (interfaceResult.status === "fulfilled") successfulScans += 1;
          else failures.push(interfaceResult.reason);
        }

        if (
          menuResult.status === "fulfilled" ||
          (preferences.includeInterfaceElements &&
            interfaceResult.status === "fulfilled")
        ) {
          commandCache.set(
            cacheKey(application, preferences.includeInterfaceElements),
            JSON.stringify(applicationCommands),
          );
        }
        return applicationCommands;
      }),
    );
    commandsRef.current = nextCommands;
    setCommands(nextCommands);
    if (applicationScope === allApplicationsScope) {
      writeStartupSnapshot(
        scanningApplicationState,
        nextCommands,
        preferences.includeInterfaceElements,
      );
    }

    if (successfulScans === 0 && !cachedCommands.length) {
      const reason = failures[0] ?? "The accessibility scan failed.";
      setError(reason instanceof Error ? reason.message : String(reason));
    }
    setIsLoadingCommands(false);
  }, [
    applicationScope,
    applicationState,
    preferences.includeInterfaceElements,
  ]);

  useEffect(() => {
    void loadUsage().then(setUsage);
    void refreshApplications();
  }, [refreshApplications]);

  useEffect(() => {
    if (!preferences.searchAllApplications) return;

    let cancelled = false;
    const refreshFocusedApplication = async () => {
      const currentApplicationState = await getRunningApplications().catch(
        () => undefined,
      );
      if (cancelled || !currentApplicationState?.defaultPid) return;
      setFocusedApplicationPID((currentPID) =>
        currentPID === currentApplicationState.defaultPid
          ? currentPID
          : currentApplicationState.defaultPid,
      );
    };

    void refreshFocusedApplication();
    const interval = setInterval(() => void refreshFocusedApplication(), 750);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [preferences.searchAllApplications]);

  useEffect(() => {
    void refreshCommands();
  }, [refreshCommands]);

  const selectedApplication = applicationState?.applications.find(
    (application) => String(application.pid) === applicationScope,
  );
  const searchesAllApplications = applicationScope === allApplicationsScope;
  const displayedApplications =
    applicationState?.applications ?? startupSnapshot?.applications ?? [];
  const searchableCommands = useMemo(
    () =>
      searchesAllApplications
        ? collapseSharedSystemCommands(commands, focusedApplicationPID)
        : commands,
    [commands, focusedApplicationPID, searchesAllApplications],
  );
  const results = useMemo(
    () =>
      rankCommands(
        searchableCommands,
        searchText,
        usage,
        focusedApplicationPID,
      ).slice(0, 150),
    [focusedApplicationPID, searchText, searchableCommands, usage],
  );
  const selectionResetKey = `${applicationScope}\0${focusedApplicationPID ?? ""}\0${searchText}`;
  const previousSelectionResetKey = useRef<string | undefined>(undefined);

  useEffect(() => {
    if (previousSelectionResetKey.current === selectionResetKey) return;
    previousSelectionResetKey.current = selectionResetKey;
    setSelectedItemID(results[0]?.command.id);
  }, [results, selectionResetKey]);

  async function run(command: FastNavCommand) {
    await closeMainWindow();
    try {
      await executeCommand(command);
      const updatedUsage = await recordUsage(command, usage);
      setUsage(updatedUsage);
      if (command.source === "menu") {
        await showHUD(`✓ ${command.title}`);
      }
    } catch (caughtError) {
      const message =
        caughtError instanceof Error
          ? caughtError.message
          : String(caughtError);
      await showHUD(`FastNav: ${message}`);
    }
  }

  async function requestPermission() {
    try {
      const response = await requestAccessibilityPermission();
      if (response.trusted) {
        await refreshApplications();
      } else {
        await open(accessibilitySettingsURL);
      }
    } catch (caughtError) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Could Not Request Accessibility Access",
        message:
          caughtError instanceof Error
            ? caughtError.message
            : String(caughtError),
      });
    }
  }

  const refreshAction = (
    <Action
      title="Refresh Actions"
      icon={Icon.ArrowClockwise}
      shortcut={Keyboard.Shortcut.Common.Refresh}
      onAction={async () => {
        await refreshApplications();
      }}
    />
  );

  const settingsAction = (
    <Action
      title="Open Extension Settings"
      icon={Icon.Gear}
      onAction={openExtensionPreferences}
    />
  );

  let content;
  if (applicationState && !applicationState.trusted) {
    content = (
      <List.EmptyView
        icon={Icon.Fingerprint}
        title="Accessibility Access Is Required"
        description="Allow Raycast to use Accessibility in System Settings → Privacy & Security → Accessibility, then refresh."
        actions={
          <ActionPanel>
            <Action
              title="Request Accessibility Access"
              icon={Icon.Fingerprint}
              onAction={requestPermission}
            />
            {refreshAction}
          </ActionPanel>
        }
      />
    );
  } else if (error && commands.length === 0) {
    content = (
      <List.EmptyView
        icon={Icon.ExclamationMark}
        title="FastNav Could Not Load Actions"
        description={error}
        actions={
          <ActionPanel>
            {refreshAction}
            {settingsAction}
          </ActionPanel>
        }
      />
    );
  } else if (applicationState && applicationState.applications.length === 0) {
    content = (
      <List.EmptyView
        icon={Icon.AppWindow}
        title="No Running Applications"
        description="Open an application, then refresh FastNav."
        actions={<ActionPanel>{refreshAction}</ActionPanel>}
      />
    );
  } else if (!isLoadingCommands && commands.length === 0) {
    content = (
      <List.EmptyView
        icon={Icon.MagnifyingGlass}
        title="No Searchable Actions"
        description={
          searchesAllApplications
            ? "The running applications did not expose menu commands or visible controls through Accessibility."
            : "This application did not expose menu commands or visible controls through Accessibility."
        }
        actions={
          <ActionPanel>
            {refreshAction}
            {settingsAction}
          </ActionPanel>
        }
      />
    );
  } else {
    content = results.map(({ command }) => {
      const breadcrumb = command.menuPath.join(" › ");
      const commandApplication = applicationForCommand(
        displayedApplications,
        command,
      );
      const liveApplication = applicationForCommand(
        applicationState?.applications ?? [],
        command,
      );
      const liveCommand =
        liveApplication &&
        (command.source === "menu" || command.pid === liveApplication.pid)
          ? {
              ...command,
              pid: liveApplication.pid,
              appName: liveApplication.name,
              bundleIdentifier: liveApplication.bundleIdentifier,
            }
          : undefined;
      return (
        <List.Item
          key={command.id}
          id={command.id}
          icon={
            commandApplication
              ? applicationIcon(commandApplication)
              : Icon.AppWindow
          }
          title={command.title}
          subtitle={breadcrumb}
          accessories={[
            ...(command.source === "interface" ? [{ tag: "Interface" }] : []),
            ...(command.shortcut
              ? [
                  {
                    tag: command.shortcut,
                    tooltip: `Keyboard shortcut: ${command.shortcut}`,
                  },
                ]
              : []),
            ...(!command.isEnabled ? [{ text: "Unavailable" }] : []),
          ]}
          actions={
            <ActionPanel>
              {command.isEnabled && liveCommand ? (
                <Action
                  title="Run Action"
                  icon={Icon.Play}
                  onAction={() => run(liveCommand)}
                />
              ) : null}
              <Action.CopyToClipboard
                title="Copy Action Details"
                content={[
                  command.appName,
                  command.title,
                  breadcrumb,
                  command.shortcut,
                ]
                  .filter(Boolean)
                  .join(" — ")}
              />
              {refreshAction}
              {settingsAction}
            </ActionPanel>
          }
        />
      );
    });
  }

  return (
    <List
      filtering={false}
      isLoading={
        commands.length === 0 && (isLoadingApplications || isLoadingCommands)
      }
      searchBarPlaceholder={
        selectedApplication
          ? `Search ${selectedApplication.name} actions…`
          : searchesAllApplications
            ? "Search actions across all apps…"
            : "Search focused app actions…"
      }
      onSearchTextChange={setSearchText}
      searchText={searchText}
      selectedItemId={selectedItemID}
      onSelectionChange={(id) => setSelectedItemID(id ?? undefined)}
      searchBarAccessory={
        applicationState?.applications.length ? (
          <List.Dropdown
            tooltip="Choose Application Scope"
            value={applicationScope}
            onChange={(scope) => {
              setSearchText("");
              setApplicationScope(scope);
            }}
          >
            {preferences.searchAllApplications ? (
              <List.Dropdown.Item
                value={allApplicationsScope}
                title="All Applications"
                icon={Icon.Globe}
              />
            ) : null}
            {applicationState.applications.map((application) => (
              <List.Dropdown.Item
                key={application.pid}
                value={String(application.pid)}
                title={application.name}
                icon={applicationIcon(application)}
              />
            ))}
          </List.Dropdown>
        ) : undefined
      }
    >
      {content}
    </List>
  );
}
