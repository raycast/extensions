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
import { loadUsage, recordUsage, UsageMap } from "./usage";

const accessibilitySettingsURL =
  "x-apple.systempreferences:com.apple.preference.security?Privacy_Accessibility";
const commandCache = new Cache({ namespace: "actions-v3" });

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
      commands.map((command) => ({
        ...command,
        id: [
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
  source: FastNavCommand["source"],
): FastNavCommand[] {
  return deduplicateCommands([
    ...current.filter((command) => command.source !== source),
    ...replacement,
  ]);
}

function iconForCommand(command: FastNavCommand): Icon {
  if (command.source === "menu") return Icon.CommandSymbol;

  switch (command.role) {
    case "AXButton":
    case "AXCheckBox":
    case "AXRadioButton":
      return Icon.Mouse;
    case "AXLink":
      return Icon.Link;
    case "AXTextField":
    case "AXTextArea":
      return Icon.TextCursor;
    case "AXRow":
    case "AXCell":
    case "AXList":
    case "AXOutline":
    case "AXTable":
      return Icon.List;
    default:
      return Icon.AppWindow;
  }
}

function applicationIcon(application: RunningApplication) {
  return application.path ? { fileIcon: application.path } : Icon.AppWindow;
}

export default function SearchAppActions() {
  const preferences = getPreferenceValues<Preferences>();
  const [applicationState, setApplicationState] =
    useState<ApplicationsResponse>();
  const [selectedPID, setSelectedPID] = useState<number>();
  const [commands, setCommands] = useState<FastNavCommand[]>([]);
  const [usage, setUsage] = useState<UsageMap>({});
  const [searchText, setSearchText] = useState("");
  const [isLoadingApplications, setIsLoadingApplications] = useState(true);
  const [isLoadingCommands, setIsLoadingCommands] = useState(false);
  const [error, setError] = useState<string>();
  const scanRevision = useRef(0);

  const refreshApplications = useCallback(async () => {
    setIsLoadingApplications(true);
    setError(undefined);
    try {
      const response = await getRunningApplications();
      setApplicationState(response);
      setSelectedPID((currentPID) =>
        response.applications.some(
          (application) => application.pid === currentPID,
        )
          ? currentPID
          : (response.defaultPid ?? response.applications[0]?.pid),
      );
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : String(caughtError),
      );
    } finally {
      setIsLoadingApplications(false);
    }
  }, []);

  const refreshCommands = useCallback(async () => {
    const revision = scanRevision.current + 1;
    scanRevision.current = revision;
    const selectedApplication = applicationState?.applications.find(
      (application) => application.pid === selectedPID,
    );
    if (!selectedPID || !selectedApplication || !applicationState?.trusted) {
      setCommands([]);
      setIsLoadingCommands(false);
      return;
    }

    const cachedCommands = readCachedCommands(
      selectedApplication,
      preferences.includeInterfaceElements,
    );
    setCommands(cachedCommands);
    setIsLoadingCommands(true);
    setError(undefined);

    const menuRequest = scanMenuCommands(selectedPID);
    const interfaceRequest = preferences.includeInterfaceElements
      ? scanInterfaceCommands(selectedPID)
      : Promise.resolve([]);

    void menuRequest.then(
      (menuCommands) => {
        if (scanRevision.current !== revision) return;
        setCommands((current) => replaceSource(current, menuCommands, "menu"));
      },
      () => undefined,
    );
    void interfaceRequest.then(
      (interfaceCommands) => {
        if (scanRevision.current !== revision) return;
        setCommands((current) =>
          replaceSource(current, interfaceCommands, "interface"),
        );
      },
      () => undefined,
    );

    const [menuResult, interfaceResult] = await Promise.allSettled([
      menuRequest,
      interfaceRequest,
    ]);
    if (scanRevision.current !== revision) return;

    const menuCommands =
      menuResult.status === "fulfilled"
        ? menuResult.value
        : cachedCommands.filter((command) => command.source === "menu");
    const interfaceCommands = preferences.includeInterfaceElements
      ? interfaceResult.status === "fulfilled"
        ? interfaceResult.value
        : cachedCommands.filter((command) => command.source === "interface")
      : [];
    const nextCommands = deduplicateCommands([
      ...menuCommands,
      ...interfaceCommands,
    ]);
    setCommands(nextCommands);

    if (
      menuResult.status === "fulfilled" ||
      interfaceResult.status === "fulfilled"
    ) {
      commandCache.set(
        cacheKey(selectedApplication, preferences.includeInterfaceElements),
        JSON.stringify(nextCommands),
      );
    } else if (!cachedCommands.length) {
      const reason =
        menuResult.status === "rejected"
          ? menuResult.reason
          : interfaceResult.status === "rejected"
            ? interfaceResult.reason
            : "The accessibility scan failed.";
      setError(reason instanceof Error ? reason.message : String(reason));
    }
    setIsLoadingCommands(false);
  }, [applicationState, preferences.includeInterfaceElements, selectedPID]);

  useEffect(() => {
    void loadUsage().then(setUsage);
    void refreshApplications();
  }, [refreshApplications]);

  useEffect(() => {
    void refreshCommands();
  }, [refreshCommands]);

  const selectedApplication = applicationState?.applications.find(
    (application) => application.pid === selectedPID,
  );
  const results = useMemo(
    () => rankCommands(commands, searchText, usage).slice(0, 150),
    [commands, searchText, usage],
  );

  async function run(command: FastNavCommand) {
    await closeMainWindow();
    try {
      await executeCommand(command);
      const updatedUsage = await recordUsage(command, usage);
      setUsage(updatedUsage);
      await showHUD(`✓ ${command.title}`);
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
        await refreshCommands();
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
  } else if (error) {
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
        description="This application did not expose menu commands or visible controls through Accessibility."
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
      return (
        <List.Item
          key={command.id}
          id={command.id}
          icon={iconForCommand(command)}
          title={command.title}
          subtitle={breadcrumb}
          accessories={[
            ...(command.source === "interface" ? [{ tag: "Interface" }] : []),
            ...(command.shortcut
              ? [{ text: command.shortcut, tooltip: "Keyboard shortcut" }]
              : []),
            ...(!command.isEnabled ? [{ text: "Unavailable" }] : []),
          ]}
          actions={
            <ActionPanel>
              {command.isEnabled ? (
                <Action
                  title="Run Action"
                  icon={Icon.Play}
                  onAction={() => run(command)}
                />
              ) : null}
              <Action.CopyToClipboard
                title="Copy Action Details"
                content={[command.title, breadcrumb, command.shortcut]
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
      isLoading={isLoadingApplications || isLoadingCommands}
      searchBarPlaceholder={
        selectedApplication
          ? `Search ${selectedApplication.name} actions…`
          : "Search app actions…"
      }
      onSearchTextChange={setSearchText}
      searchBarAccessory={
        applicationState?.applications.length ? (
          <List.Dropdown
            tooltip="Choose Running Application"
            value={selectedPID ? String(selectedPID) : undefined}
            onChange={(pid) => {
              setSearchText("");
              setSelectedPID(Number(pid));
            }}
          >
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
