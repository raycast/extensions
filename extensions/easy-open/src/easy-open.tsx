import {
  Action,
  ActionPanel,
  Form,
  Icon,
  Image,
  List,
  LocalStorage,
  getPreferenceValues,
  open,
  openCommandPreferences,
  showInFinder,
  showToast,
  Toast,
  useNavigation,
} from "@raycast/api";
import { useLocalStorage, usePromise } from "@raycast/utils";
import { execFile } from "node:child_process";
import { basename } from "node:path";
import { readdir, realpath } from "node:fs/promises";
import { promisify } from "node:util";

const ROOT_FOLDERS_STORAGE_KEY = "root-folders";
const APPLICATIONS_STORAGE_KEY = "applications";
const COMMAND_OPENERS_STORAGE_KEY = "command-openers";
const RECENT_DIRECTORIES_STORAGE_KEY = "recent-directories";
const execFileAsync = promisify(execFile);

type DirectoryItem = {
  id: string;
  name: string;
  path: string;
  rootPath: string;
  rootName: string;
};

type ScanResult = {
  directories: DirectoryItem[];
  warnings: string[];
};

type DisplayMode = "name-only" | "root-and-name";
type ApplicationItem = {
  id: string;
  name: string;
  path: string;
};
type RootFolderStatus = {
  path: string;
  resolvedPath: string | null;
  status: "ok" | "duplicate" | "inaccessible" | "empty";
  subdirectoryCount: number;
  duplicateOf?: string;
};
type CommandOpener = {
  id: string;
  name: string;
  command: string;
  terminalApp: string;
  closeAfterCommand: boolean;
};
type OpenerItem =
  | {
      id: string;
      kind: "application";
      name: string;
      path: string;
    }
  | {
      id: string;
      kind: "command";
      name: string;
      command: string;
      terminalApp: string;
    };
type RecentDirectories = Record<string, number>;
type CommandFormValues = {
  closeAfterCommand: boolean;
  command: string;
  name: string;
  terminalApp: string;
};

const SUPPORTED_TERMINAL_APPS = [
  { title: "Terminal", value: "/System/Applications/Utilities/Terminal.app" },
  { title: "iTerm", value: "/Applications/iTerm.app" },
  { title: "Ghostty", value: "/Applications/Ghostty.app" },
];

function moveItem<T>(items: T[], fromIndex: number, toIndex: number): T[] {
  if (toIndex < 0 || toIndex >= items.length || fromIndex === toIndex) {
    return items;
  }

  const nextItems = [...items];
  const [item] = nextItems.splice(fromIndex, 1);
  nextItems.splice(toIndex, 0, item);
  return nextItems;
}

async function safeRealpath(path: string): Promise<string | null> {
  try {
    return await realpath(path);
  } catch {
    return null;
  }
}

async function collectDirectories(rootPath: string): Promise<DirectoryItem[]> {
  const rootRealPath = await safeRealpath(rootPath);
  if (!rootRealPath) {
    return [];
  }

  const rootName = basename(rootRealPath) || rootRealPath;
  let entries;
  try {
    entries = await readdir(rootRealPath, { withFileTypes: true });
  } catch {
    return [];
  }

  const directories: DirectoryItem[] = [];

  for (const entry of entries) {
    if (!entry.isDirectory()) {
      continue;
    }

    const childPath = `${rootRealPath}/${entry.name}`;
    const childRealPath = await safeRealpath(childPath);
    if (!childRealPath) {
      continue;
    }

    directories.push({
      id: childRealPath,
      name: entry.name,
      path: childRealPath,
      rootPath: rootRealPath,
      rootName,
    });
  }

  return directories;
}

async function scanDirectories(rootFolders: string[]): Promise<ScanResult> {
  const seenDirectoryPaths = new Set<string>();
  const warnings: string[] = [];
  const directories: DirectoryItem[] = [];

  for (const rootFolder of rootFolders) {
    const resolvedRoot = await safeRealpath(rootFolder);
    if (!resolvedRoot) {
      warnings.push(`Cannot access root folder: ${rootFolder}`);
      continue;
    }

    const result = await collectDirectories(resolvedRoot);
    if (result.length === 0) {
      warnings.push(`No subdirectories found in: ${resolvedRoot}`);
      continue;
    }

    for (const directory of result) {
      if (seenDirectoryPaths.has(directory.path)) {
        continue;
      }

      seenDirectoryPaths.add(directory.path);
      directories.push(directory);
    }
  }

  return { directories, warnings };
}

async function analyzeRootFolders(rootFolders: string[]): Promise<RootFolderStatus[]> {
  const seenResolvedPaths = new Map<string, string>();
  const statuses: RootFolderStatus[] = [];

  for (const rootFolder of rootFolders) {
    const resolvedRoot = await safeRealpath(rootFolder);
    if (!resolvedRoot) {
      statuses.push({
        path: rootFolder,
        resolvedPath: null,
        status: "inaccessible",
        subdirectoryCount: 0,
      });
      continue;
    }

    const duplicateOf = seenResolvedPaths.get(resolvedRoot);
    if (duplicateOf) {
      statuses.push({
        path: rootFolder,
        resolvedPath: resolvedRoot,
        status: "duplicate",
        subdirectoryCount: 0,
        duplicateOf,
      });
      continue;
    }

    seenResolvedPaths.set(resolvedRoot, rootFolder);

    let entries;
    try {
      entries = await readdir(resolvedRoot, { withFileTypes: true });
    } catch {
      statuses.push({
        path: rootFolder,
        resolvedPath: resolvedRoot,
        status: "inaccessible",
        subdirectoryCount: 0,
      });
      continue;
    }

    const subdirectoryCount = entries.filter((entry) => entry.isDirectory()).length;
    statuses.push({
      path: rootFolder,
      resolvedPath: resolvedRoot,
      status: subdirectoryCount > 0 ? "ok" : "empty",
      subdirectoryCount,
    });
  }

  return statuses;
}

function getRootFolderStatusMeta(status: RootFolderStatus): {
  accessoryText: string;
  subtitle: string;
  tintColor?: string;
} {
  if (status.status === "inaccessible") {
    return {
      accessoryText: "Inaccessible",
      subtitle: status.path,
      tintColor: "#FF453A",
    };
  }

  if (status.status === "duplicate") {
    return {
      accessoryText: "Duplicate",
      subtitle: `Same as ${status.duplicateOf}`,
      tintColor: "#FF9F0A",
    };
  }

  if (status.status === "empty") {
    return {
      accessoryText: "Empty",
      subtitle: status.resolvedPath ?? status.path,
      tintColor: "#FFD60A",
    };
  }

  return {
    accessoryText: `${status.subdirectoryCount} dirs`,
    subtitle: status.resolvedPath ?? status.path,
  };
}

function sortDirectories(directories: DirectoryItem[], recentDirectories: RecentDirectories): DirectoryItem[] {
  return [...directories].sort((left, right) => {
    const leftLastOpenedAt = recentDirectories[left.path] ?? 0;
    const rightLastOpenedAt = recentDirectories[right.path] ?? 0;
    if (leftLastOpenedAt !== rightLastOpenedAt) {
      return rightLastOpenedAt - leftLastOpenedAt;
    }

    if (left.name !== right.name) {
      return left.name.localeCompare(right.name);
    }

    return left.path.localeCompare(right.path);
  });
}

function getPreferences() {
  const preferences = getPreferenceValues<Preferences.EasyOpen>();

  return {
    displayMode: preferences.displayMode as DisplayMode,
  };
}

function getApplicationName(path: string): string {
  return (basename(path) || path).replace(/\.(app|exe)$/i, "");
}

function getTerminalAppName(path: string): string {
  return (basename(path) || path).replace(/\.app$/i, "");
}

async function normalizePaths(paths: string[]): Promise<string[]> {
  const normalizedPaths = await Promise.all(paths.map((path) => safeRealpath(path)));
  return Array.from(new Set(normalizedPaths.filter((path): path is string => Boolean(path))));
}

function buildOpeners(applications: string[], commandOpeners: CommandOpener[]): OpenerItem[] {
  return [
    ...applications.map<OpenerItem>((path) => ({
      id: `application:${path}`,
      kind: "application",
      name: getApplicationName(path),
      path,
    })),
    ...commandOpeners.map<OpenerItem>((opener) => ({
      id: opener.id,
      kind: "command",
      name: opener.name,
      command: opener.command,
      terminalApp: opener.terminalApp,
    })),
  ];
}

function quoteShellPath(path: string): string {
  return `'${path.replace(/'/g, `'\\''`)}'`;
}

function buildCommandToRun(command: string, directoryPath: string): string {
  const quotedPath = quoteShellPath(directoryPath);
  return command.includes("{path}") ? command.replaceAll("{path}", quotedPath) : `${command} ${quotedPath}`;
}

function wrapCommandForShell(command: string, closeAfterCommand: boolean): string {
  if (!closeAfterCommand) {
    return command;
  }

  const escapedCommand = command.replace(/'/g, `'\\''`);
  return `zsh -lc '${escapedCommand}; exit'`;
}

async function runCommandInTerminal(
  command: string,
  terminalAppPath: string,
  directoryPath: string,
  closeAfterCommand: boolean,
) {
  if (process.platform !== "darwin") {
    throw new Error("Command openers currently support macOS terminal apps only.");
  }

  const terminalName = getTerminalAppName(terminalAppPath).toLowerCase();
  const commandToRun = wrapCommandForShell(buildCommandToRun(command, directoryPath), closeAfterCommand);

  if (terminalName === "terminal") {
    await execFileAsync("osascript", [
      "-e",
      `tell application "${getTerminalAppName(terminalAppPath)}" to activate`,
      "-e",
      `tell application "${getTerminalAppName(terminalAppPath)}" to do script ${JSON.stringify(commandToRun)}`,
    ]);
    return;
  }

  if (terminalName === "iterm" || terminalName === "iterm2") {
    await execFileAsync("osascript", [
      "-e",
      `tell application "${getTerminalAppName(terminalAppPath)}" to activate`,
      "-e",
      `tell application "${getTerminalAppName(terminalAppPath)}" to create window with default profile command ${JSON.stringify(commandToRun)}`,
    ]);
    return;
  }

  if (terminalName === "ghostty") {
    await execFileAsync("osascript", [
      "-e",
      `tell application "${getTerminalAppName(terminalAppPath)}" to activate`,
      "-e",
      `tell application "${getTerminalAppName(terminalAppPath)}"`,
      "-e",
      "set win to new window",
      "-e",
      "set term to focused terminal of selected tab of win",
      "-e",
      `input text ${JSON.stringify(commandToRun)} to term`,
      "-e",
      'send key "enter" to term',
      "-e",
      "end tell",
    ]);
    return;
  }

  throw new Error("Only Terminal, iTerm, and Ghostty are currently supported for command openers.");
}

async function recordRecentDirectory(path: string) {
  const currentValue = (await LocalStorage.getItem<string>(RECENT_DIRECTORIES_STORAGE_KEY)) ?? "{}";
  const currentRecentDirectories = JSON.parse(currentValue) as RecentDirectories;
  await LocalStorage.setItem(
    RECENT_DIRECTORIES_STORAGE_KEY,
    JSON.stringify({
      ...currentRecentDirectories,
      [path]: Date.now(),
    }),
  );
}

export default function Command() {
  const { displayMode } = getPreferences();
  const { push } = useNavigation();
  const { value: applications = [], isLoading: isLoadingApplications } = useLocalStorage<string[]>(
    APPLICATIONS_STORAGE_KEY,
    [],
  );
  const { value: commandOpeners = [], isLoading: isLoadingCommandOpeners } = useLocalStorage<CommandOpener[]>(
    COMMAND_OPENERS_STORAGE_KEY,
    [],
  );
  const { value: rootFolders = [], isLoading: isLoadingRootFolders } = useLocalStorage<string[]>(
    ROOT_FOLDERS_STORAGE_KEY,
    [],
  );
  const {
    value: recentDirectories = {},
    setValue: setRecentDirectories,
    isLoading: isLoadingRecentDirectories,
  } = useLocalStorage<RecentDirectories>(RECENT_DIRECTORIES_STORAGE_KEY, {});
  const { data, isLoading, revalidate } = usePromise(
    async () => {
      if (rootFolders.length === 0) {
        return {
          directories: [],
          warnings: ["No root folders configured."],
        };
      }

      return scanDirectories(rootFolders);
    },
    [rootFolders.join("\n")],
    {
      execute: !isLoadingRootFolders,
    },
  );

  const directories = sortDirectories(data?.directories ?? [], recentDirectories);
  const warnings = data?.warnings ?? [];
  const useRootAndName = displayMode === "root-and-name";
  const openers = buildOpeners(applications, commandOpeners);
  const hasConfiguredOpeners = openers.length > 0;

  function openRootFolderManager() {
    push(<RootFolderManager onRefresh={revalidate} />);
  }

  function openApplicationManager() {
    push(<ApplicationManager />);
  }

  function openCommandManager() {
    push(<CommandManager />);
  }

  async function handleOpenWithApplication(path: string, applicationPath: string) {
    const toast = await showToast({
      style: Toast.Style.Animated,
      title: "Opening Directory",
      message: path,
    });

    try {
      await open(path, applicationPath);
      await recordRecentDirectory(path);
      await setRecentDirectories({
        ...recentDirectories,
        [path]: Date.now(),
      });
      toast.style = Toast.Style.Success;
      toast.title = "Directory Opened";
      toast.message = `${basename(path)} with ${getApplicationName(applicationPath)}`;
    } catch (error) {
      toast.style = Toast.Style.Failure;
      toast.title = "Failed to Open Directory";
      toast.message = error instanceof Error ? error.message : "Unknown error";
    }
  }

  async function handleOpenWithCommand(path: string, opener: CommandOpener) {
    const toast = await showToast({
      style: Toast.Style.Animated,
      title: "Running Command",
      message: opener.name,
    });

    try {
      await runCommandInTerminal(opener.command, opener.terminalApp, path, opener.closeAfterCommand);
      await recordRecentDirectory(path);
      await setRecentDirectories({
        ...recentDirectories,
        [path]: Date.now(),
      });
      toast.style = Toast.Style.Success;
      toast.title = "Command Started";
      toast.message = `${opener.name} in ${getTerminalAppName(opener.terminalApp)}`;
    } catch (error) {
      toast.style = Toast.Style.Failure;
      toast.title = "Failed to Run Command";
      toast.message = error instanceof Error ? error.message : "Unknown error";
    }
  }

  function handleOpenDirectory(directory: DirectoryItem) {
    if (openers.length === 1) {
      const opener = openers[0];
      if (opener.kind === "application") {
        void handleOpenWithApplication(directory.path, opener.path);
      } else {
        void handleOpenWithCommand(directory.path, {
          id: opener.id,
          name: opener.name,
          command: opener.command,
          terminalApp: opener.terminalApp,
          closeAfterCommand: opener.closeAfterCommand,
        });
      }
      return;
    }

    push(
      <OpenerPicker
        commandOpeners={commandOpeners}
        directory={directory}
        applications={applications}
        onOpenApplication={handleOpenWithApplication}
        onOpenCommand={handleOpenWithCommand}
      />,
    );
  }

  if (
    !isLoading &&
    !isLoadingRootFolders &&
    !isLoadingApplications &&
    !isLoadingCommandOpeners &&
    (!hasConfiguredOpeners || rootFolders.length === 0)
  ) {
    return (
      <List searchBarPlaceholder="Configure Easy Open">
        <List.EmptyView
          title={!hasConfiguredOpeners ? "Openers Not Configured" : "Root Folders Not Configured"}
          description={
            !hasConfiguredOpeners
              ? "Choose one or more applications or commands that can open a directory."
              : "Choose one or more root folders with the directory picker."
          }
          actions={
            <ActionPanel>
              <Action title="Manage Applications" icon={Icon.AppWindow} onAction={openApplicationManager} />
              <Action title="Manage Commands" icon={Icon.Terminal} onAction={openCommandManager} />
              <Action title="Manage Root Folders" icon={Icon.Folder} onAction={openRootFolderManager} />
              <Action title="Open Command Preferences" icon={Icon.Gear} onAction={openCommandPreferences} />
            </ActionPanel>
          }
        />
      </List>
    );
  }

  return (
    <List
      isLoading={
        isLoading ||
        isLoadingRootFolders ||
        isLoadingApplications ||
        isLoadingCommandOpeners ||
        isLoadingRecentDirectories
      }
      searchBarPlaceholder="Search directories"
      isShowingDetail={false}
      navigationTitle="Easy Open"
    >
      {warnings.length > 0 ? (
        <List.Section title="Warnings">
          {warnings.map((warning) => (
            <List.Item
              key={warning}
              title={warning}
              icon={{ source: Icon.ExclamationMark, tintColor: "#FF9F0A" }}
              actions={
                <ActionPanel>
                  <Action title="Manage Applications" icon={Icon.AppWindow} onAction={openApplicationManager} />
                  <Action title="Manage Commands" icon={Icon.Terminal} onAction={openCommandManager} />
                  <Action title="Manage Root Folders" icon={Icon.Folder} onAction={openRootFolderManager} />
                  <Action title="Open Command Preferences" icon={Icon.Gear} onAction={openCommandPreferences} />
                  <Action title="Refresh" icon={Icon.ArrowClockwise} onAction={() => revalidate()} />
                </ActionPanel>
              }
            />
          ))}
        </List.Section>
      ) : null}

      <List.Section title={`Directories (${directories.length})`}>
        {directories.map((directory) => (
          <List.Item
            key={directory.id}
            title={useRootAndName ? `${directory.rootName} / ${directory.name}` : directory.name}
            subtitle={useRootAndName ? directory.path : directory.rootName}
            accessories={[{ tag: directory.rootName }]}
            icon={{ fileIcon: directory.path } as Image.ImageLike}
            actions={
              <ActionPanel>
                <Action
                  title={openers.length === 1 ? "Open with Configured Opener" : "Choose Opener"}
                  icon={Icon.Bolt}
                  onAction={() => handleOpenDirectory(directory)}
                />
                <Action title="Show in Finder" icon={Icon.Finder} onAction={() => showInFinder(directory.path)} />
                <Action.CopyToClipboard title="Copy Path" content={directory.path} />
                <Action title="Manage Applications" icon={Icon.AppWindow} onAction={openApplicationManager} />
                <Action title="Manage Commands" icon={Icon.Terminal} onAction={openCommandManager} />
                <Action title="Manage Root Folders" icon={Icon.Folder} onAction={openRootFolderManager} />
                <Action title="Refresh" icon={Icon.ArrowClockwise} onAction={() => revalidate()} />
                <Action title="Open Command Preferences" icon={Icon.Gear} onAction={openCommandPreferences} />
              </ActionPanel>
            }
          />
        ))}
      </List.Section>
    </List>
  );
}

type RootFolderFormValues = {
  rootFolders: string[];
};

type RootFolderManagerProps = {
  onRefresh: () => Promise<ScanResult | undefined>;
};

function RootFolderManager({ onRefresh }: RootFolderManagerProps) {
  const { push, pop } = useNavigation();
  const { value: rootFolders = [], setValue: setRootFolders } = useLocalStorage<string[]>(ROOT_FOLDERS_STORAGE_KEY, []);
  const { data: rootFolderStatuses = [], isLoading } = usePromise(
    () => analyzeRootFolders(rootFolders),
    [rootFolders.join("\n")],
  );

  function openAddRootFoldersForm() {
    push(
      <RootFolderForm
        onSave={async (folders) => {
          const uniqueFolders = await normalizePaths([...rootFolders, ...folders]);
          await setRootFolders(uniqueFolders);
          await onRefresh();
          pop();
        }}
      />,
    );
  }

  async function handleRemoveRootFolder(path: string) {
    await setRootFolders(rootFolders.filter((folder) => folder !== path));
    await onRefresh();
  }

  async function handleClearAll() {
    await setRootFolders([]);
    await onRefresh();
  }

  return (
    <List navigationTitle="Manage Root Folders" searchBarPlaceholder="Configured root folders" isLoading={isLoading}>
      <List.Section title={`Configured Roots (${rootFolders.length})`}>
        {rootFolderStatuses.map((rootFolderStatus) => {
          const meta = getRootFolderStatusMeta(rootFolderStatus);
          return (
            <List.Item
              key={rootFolderStatus.path}
              title={basename(rootFolderStatus.path) || rootFolderStatus.path}
              subtitle={meta.subtitle}
              accessories={[
                meta.tintColor
                  ? { tag: { value: meta.accessoryText, color: meta.tintColor } }
                  : { text: meta.accessoryText },
              ]}
              icon={{ fileIcon: rootFolderStatus.path } as Image.ImageLike}
              actions={
                <ActionPanel>
                  <Action title="Add Root Folders" icon={Icon.Plus} onAction={openAddRootFoldersForm} />
                  <Action
                    title="Show in Finder"
                    icon={Icon.Finder}
                    onAction={() => showInFinder(rootFolderStatus.path)}
                  />
                  <Action.CopyToClipboard title="Copy Path" content={rootFolderStatus.path} />
                  <Action
                    title="Remove Root Folder"
                    icon={Icon.Trash}
                    style={Action.Style.Destructive}
                    onAction={() => handleRemoveRootFolder(rootFolderStatus.path)}
                  />
                  <Action
                    title="Clear All Root Folders"
                    icon={Icon.XMarkCircle}
                    style={Action.Style.Destructive}
                    onAction={handleClearAll}
                  />
                </ActionPanel>
              }
            />
          );
        })}
      </List.Section>
      {rootFolders.length === 0 ? (
        <List.EmptyView
          title="No Root Folders"
          description="Add one or more root folders with the directory picker."
          actions={
            <ActionPanel>
              <Action title="Add Root Folders" icon={Icon.Plus} onAction={openAddRootFoldersForm} />
            </ActionPanel>
          }
        />
      ) : null}
    </List>
  );
}

type RootFolderFormProps = {
  onSave: (folders: string[]) => Promise<void>;
};

function RootFolderForm({ onSave }: RootFolderFormProps) {
  async function handleSubmit(values: RootFolderFormValues) {
    const uniqueFolders = Array.from(new Set(values.rootFolders));
    await onSave(uniqueFolders);
  }

  return (
    <Form
      navigationTitle="Add Root Folders"
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Add Root Folders" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.Description text="Choose one or more root folders. Easy Open will list the first-level subdirectories inside them." />
      <Form.FilePicker
        id="rootFolders"
        title="Root Folders"
        allowMultipleSelection
        canChooseDirectories
        canChooseFiles={false}
      />
    </Form>
  );
}

type ApplicationFormValues = {
  applications: string[];
};

function ApplicationManager() {
  const { push, pop } = useNavigation();
  const { value: applications = [], setValue: setApplications } = useLocalStorage<string[]>(
    APPLICATIONS_STORAGE_KEY,
    [],
  );

  function openAddApplicationsForm() {
    push(
      <ApplicationForm
        onSave={async (nextApplications) => {
          const uniqueApplications = await normalizePaths([...applications, ...nextApplications]);
          await setApplications(uniqueApplications);
          pop();
        }}
      />,
    );
  }

  async function handleRemoveApplication(path: string) {
    await setApplications(applications.filter((application) => application !== path));
  }

  async function handleMoveApplication(path: string, direction: "up" | "down") {
    const currentIndex = applications.findIndex((application) => application === path);
    if (currentIndex < 0) {
      return;
    }

    const nextIndex = direction === "up" ? currentIndex - 1 : currentIndex + 1;
    await setApplications(moveItem(applications, currentIndex, nextIndex));
  }

  async function handleClearAll() {
    await setApplications([]);
  }

  return (
    <List navigationTitle="Manage Applications" searchBarPlaceholder="Configured applications">
      <List.Section title={`Configured Applications (${applications.length})`}>
        {applications.map((applicationPath, index) => (
          <List.Item
            key={applicationPath}
            title={getApplicationName(applicationPath)}
            subtitle={applicationPath}
            accessories={[{ text: `${index + 1}` }]}
            icon={{ fileIcon: applicationPath } as Image.ImageLike}
            actions={
              <ActionPanel>
                <Action title="Add Applications" icon={Icon.Plus} onAction={openAddApplicationsForm} />
                <Action
                  title="Move Application up"
                  icon={Icon.ArrowUp}
                  shortcut={{ modifiers: ["cmd", "shift"], key: "arrowUp" }}
                  onAction={() => handleMoveApplication(applicationPath, "up")}
                />
                <Action
                  title="Move Application Down"
                  icon={Icon.ArrowDown}
                  shortcut={{ modifiers: ["cmd", "shift"], key: "arrowDown" }}
                  onAction={() => handleMoveApplication(applicationPath, "down")}
                />
                <Action title="Show in Finder" icon={Icon.Finder} onAction={() => showInFinder(applicationPath)} />
                <Action.CopyToClipboard title="Copy Path" content={applicationPath} />
                <Action
                  title="Remove Application"
                  icon={Icon.Trash}
                  style={Action.Style.Destructive}
                  onAction={() => handleRemoveApplication(applicationPath)}
                />
                <Action
                  title="Clear All Applications"
                  icon={Icon.XMarkCircle}
                  style={Action.Style.Destructive}
                  onAction={handleClearAll}
                />
              </ActionPanel>
            }
          />
        ))}
      </List.Section>
      {applications.length === 0 ? (
        <List.EmptyView
          title="No Applications"
          description="Add one or more applications that should open a directory."
          actions={
            <ActionPanel>
              <Action title="Add Applications" icon={Icon.Plus} onAction={openAddApplicationsForm} />
            </ActionPanel>
          }
        />
      ) : null}
    </List>
  );
}

type ApplicationFormProps = {
  onSave: (applications: string[]) => Promise<void>;
};

function ApplicationForm({ onSave }: ApplicationFormProps) {
  async function handleSubmit(values: ApplicationFormValues) {
    const uniqueApplications = await normalizePaths(values.applications);
    await onSave(uniqueApplications);
  }

  return (
    <Form
      navigationTitle="Add Applications"
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Add Applications" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.Description text="Choose one or more applications. On macOS, select .app bundles. On Windows, select executable files." />
      <Form.FilePicker
        id="applications"
        title="Applications"
        allowMultipleSelection
        canChooseDirectories
        canChooseFiles
      />
    </Form>
  );
}

function CommandManager() {
  const { push, pop } = useNavigation();
  const { value: commandOpeners = [], setValue: setCommandOpeners } = useLocalStorage<CommandOpener[]>(
    COMMAND_OPENERS_STORAGE_KEY,
    [],
  );

  function openAddCommandForm() {
    push(
      <CommandForm
        onSave={async (commandOpener) => {
          await setCommandOpeners([...commandOpeners, commandOpener]);
          pop();
        }}
      />,
    );
  }

  function openEditCommandForm(commandOpener: CommandOpener) {
    push(
      <CommandForm
        commandOpener={commandOpener}
        onSave={async (updatedCommandOpener) => {
          await setCommandOpeners(
            commandOpeners.map((currentCommandOpener) =>
              currentCommandOpener.id === updatedCommandOpener.id ? updatedCommandOpener : currentCommandOpener,
            ),
          );
          pop();
        }}
      />,
    );
  }

  async function handleRemoveCommand(id: string) {
    await setCommandOpeners(commandOpeners.filter((commandOpener) => commandOpener.id !== id));
  }

  async function handleMoveCommand(id: string, direction: "up" | "down") {
    const currentIndex = commandOpeners.findIndex((commandOpener) => commandOpener.id === id);
    if (currentIndex < 0) {
      return;
    }

    const nextIndex = direction === "up" ? currentIndex - 1 : currentIndex + 1;
    await setCommandOpeners(moveItem(commandOpeners, currentIndex, nextIndex));
  }

  async function handleClearAll() {
    await setCommandOpeners([]);
  }

  return (
    <List navigationTitle="Manage Commands" searchBarPlaceholder="Configured commands">
      <List.Section title={`Configured Commands (${commandOpeners.length})`}>
        {commandOpeners.map((commandOpener, index) => (
          <List.Item
            key={commandOpener.id}
            title={commandOpener.name}
            subtitle={commandOpener.command}
            accessories={[{ tag: getTerminalAppName(commandOpener.terminalApp) }, { text: `${index + 1}` }]}
            icon={Icon.Terminal}
            actions={
              <ActionPanel>
                <Action title="Add Commands" icon={Icon.Plus} onAction={openAddCommandForm} />
                <Action title="Edit Command" icon={Icon.Pencil} onAction={() => openEditCommandForm(commandOpener)} />
                <Action
                  title="Move Command up"
                  icon={Icon.ArrowUp}
                  onAction={() => handleMoveCommand(commandOpener.id, "up")}
                />
                <Action
                  title="Move Command Down"
                  icon={Icon.ArrowDown}
                  onAction={() => handleMoveCommand(commandOpener.id, "down")}
                />
                <Action.CopyToClipboard title="Copy Command" content={commandOpener.command} />
                <Action
                  title="Remove Command"
                  icon={Icon.Trash}
                  style={Action.Style.Destructive}
                  onAction={() => handleRemoveCommand(commandOpener.id)}
                />
                <Action
                  title="Clear All Commands"
                  icon={Icon.XMarkCircle}
                  style={Action.Style.Destructive}
                  onAction={handleClearAll}
                />
              </ActionPanel>
            }
          />
        ))}
      </List.Section>
      {commandOpeners.length === 0 ? (
        <List.EmptyView
          title="No Commands"
          description="Add one or more command openers."
          actions={
            <ActionPanel>
              <Action title="Add Commands" icon={Icon.Plus} onAction={openAddCommandForm} />
            </ActionPanel>
          }
        />
      ) : null}
    </List>
  );
}

type CommandFormProps = {
  onSave: (commandOpener: CommandOpener) => Promise<void>;
  commandOpener?: CommandOpener;
};

function CommandForm({ onSave, commandOpener }: CommandFormProps) {
  async function handleSubmit(values: CommandFormValues) {
    const terminalApp = values.terminalApp;
    if (!terminalApp) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Terminal App Required",
        message: "Choose a terminal app for this command opener.",
      });
      return;
    }

    const normalizedTerminalApp = await safeRealpath(terminalApp);
    if (!normalizedTerminalApp) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Invalid Terminal App",
        message: "The selected terminal app could not be resolved.",
      });
      return;
    }

    await onSave({
      id: commandOpener?.id ?? `command:${Date.now()}:${values.name}`,
      closeAfterCommand: values.closeAfterCommand,
      name: values.name.trim(),
      command: values.command.trim(),
      terminalApp: normalizedTerminalApp,
    });
  }

  return (
    <Form
      navigationTitle={commandOpener ? "Edit Command" : "Add Command"}
      actions={
        <ActionPanel>
          <Action.SubmitForm title={commandOpener ? "Save Command" : "Add Command"} onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.Description text="Configure a command opener. Use {path} in the command to control where the selected directory path is inserted. If omitted, the path is appended at the end." />
      <Form.TextField id="name" title="Name" placeholder="List Directory" defaultValue={commandOpener?.name} />
      <Form.TextField id="command" title="Command" placeholder="ls -la {path}" defaultValue={commandOpener?.command} />
      <Form.Dropdown
        id="terminalApp"
        title="Terminal App"
        defaultValue={commandOpener?.terminalApp ?? SUPPORTED_TERMINAL_APPS[0].value}
      >
        {SUPPORTED_TERMINAL_APPS.map((terminalApp) => (
          <Form.Dropdown.Item key={terminalApp.value} value={terminalApp.value} title={terminalApp.title} />
        ))}
      </Form.Dropdown>
      <Form.Checkbox
        id="closeAfterCommand"
        label="Close After Command"
        info="Best effort. Ghostty is the most reliable. Terminal and iTerm may also require their profile to close when the shell exits."
        defaultValue={commandOpener?.closeAfterCommand ?? true}
      />
    </Form>
  );
}

type OpenerPickerProps = {
  applications: string[];
  commandOpeners: CommandOpener[];
  directory: DirectoryItem;
  onOpenApplication: (directoryPath: string, applicationPath: string) => Promise<void>;
  onOpenCommand: (directoryPath: string, opener: CommandOpener) => Promise<void>;
};

function OpenerPicker({
  applications,
  commandOpeners,
  directory,
  onOpenApplication,
  onOpenCommand,
}: OpenerPickerProps) {
  const applicationItems: ApplicationItem[] = applications.map((path) => ({
    id: path,
    name: getApplicationName(path),
    path,
  }));

  return (
    <List navigationTitle={`Open ${directory.name} With`} searchBarPlaceholder="Choose an opener">
      <List.Section title={`Applications (${applicationItems.length})`} subtitle={directory.path}>
        {applicationItems.map((application) => (
          <List.Item
            key={application.id}
            title={application.name}
            subtitle={application.path}
            icon={{ fileIcon: application.path } as Image.ImageLike}
            actions={
              <ActionPanel>
                <Action
                  title={`Open with ${application.name}`}
                  icon={Icon.AppWindow}
                  onAction={() => onOpenApplication(directory.path, application.path)}
                />
                <Action.CopyToClipboard title="Copy Application Path" content={application.path} />
              </ActionPanel>
            }
          />
        ))}
      </List.Section>
      <List.Section title={`Commands (${commandOpeners.length})`} subtitle={directory.path}>
        {commandOpeners.map((commandOpener) => (
          <List.Item
            key={commandOpener.id}
            title={commandOpener.name}
            subtitle={commandOpener.command}
            accessories={[{ tag: getTerminalAppName(commandOpener.terminalApp) }]}
            icon={Icon.Terminal}
            actions={
              <ActionPanel>
                <Action
                  title={`Run ${commandOpener.name}`}
                  icon={Icon.Terminal}
                  onAction={() => onOpenCommand(directory.path, commandOpener)}
                />
                <Action.CopyToClipboard title="Copy Command" content={commandOpener.command} />
              </ActionPanel>
            }
          />
        ))}
      </List.Section>
    </List>
  );
}
