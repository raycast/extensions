import {
  List,
  ActionPanel,
  Action,
  Icon,
  Color,
  open,
  environment,
} from "@raycast/api";
import { spawn } from "child_process";
import path from "path";

const SERVER_EXE_NAME = "raycast-bridge-server.exe";

function getExePath(): string {
  return path.join(environment.supportPath, SERVER_EXE_NAME);
}

function spawnServer(exePath: string) {
  try {
    const child = spawn(exePath, [], {
      detached: true,
      stdio: "ignore",
      windowsHide: true,
    });
    child.unref();
  } catch {
    // ignore
  }
}

// ─── Server is completely down ────────────────────────────────────────────────
export function ServerDownView({ onStarted }: { onStarted?: () => void }) {
  const exePath = getExePath();

  return (
    <List>
      <List.EmptyView
        title="Bridge Server Not Running"
        description="Start the server to connect your browser tabs."
        icon={{ source: Icon.XMarkCircle, tintColor: Color.Red }}
        actions={
          <ActionPanel>
            <Action
              title="Start Server"
              icon={{ source: Icon.Play, tintColor: Color.Green }}
              shortcut={{ modifiers: ["ctrl"], key: "s" }}
              onAction={() => {
                spawnServer(exePath);
                setTimeout(() => onStarted?.(), 800);
              }}
            />
            <Action
              title="Open Manage Server"
              icon={{ source: Icon.Gear, tintColor: Color.Blue }}
              shortcut={{ modifiers: ["ctrl"], key: "m" }}
              onAction={() =>
                open("raycast://extensions/water_tear/switch-tabs/manageServer")
              }
            />
          </ActionPanel>
        }
      />
    </List>
  );
}

// ─── Connected, waiting for first data push ───────────────────────────────────
export function WaitingForDataView({
  searchBarPlaceholder,
  setSearchText,
}: {
  searchBarPlaceholder: string;
  setSearchText: (t: string) => void;
}) {
  return (
    <List
      isLoading={true}
      searchBarPlaceholder={searchBarPlaceholder}
      onSearchTextChange={setSearchText}
    >
      <List.EmptyView
        title="Connected — Loading Tabs"
        description="Browser is connected. Waiting for tab data..."
        icon={{ source: Icon.CircleProgress, tintColor: Color.Blue }}
      />
    </List>
  );
}

// ─── Legacy / connection error ────────────────────────────────────────────────
export function ConnectionErrorView({
  error,
  reinitialize,
}: {
  error: string;
  reinitialize: () => void;
}) {
  return (
    <List>
      <List.EmptyView
        title="Connection Failed"
        description={error}
        icon={{ source: Icon.Warning, tintColor: Color.Red }}
        actions={
          <ActionPanel>
            <Action
              title="Retry"
              onAction={reinitialize}
              icon={Icon.RotateClockwise}
              shortcut={{ modifiers: ["ctrl"], key: "r" }}
            />
            <Action.CopyToClipboard title="Copy Error" content={error} />
          </ActionPanel>
        }
      />
    </List>
  );
}

// ─── Hanging server (native host initializing) ────────────────────────────────
export function HangingServerView({
  serverStatus,
  searchBarPlaceholder,
  reinitialize,
  setSearchText,
}: {
  serverStatus: string;
  searchBarPlaceholder: string;
  reinitialize: () => void;
  setSearchText: (text: string) => void;
}) {
  return (
    <List
      isLoading={true}
      searchBarPlaceholder={searchBarPlaceholder}
      onSearchTextChange={setSearchText}
    >
      <List.EmptyView
        title={
          serverStatus === "LISTENING"
            ? "Waiting for Browser"
            : "Initializing..."
        }
        description={
          serverStatus === "LISTENING"
            ? "Server is ready. Open a supported browser to see your tabs."
            : "Starting the bridge server..."
        }
        icon={{
          source: serverStatus === "LISTENING" ? Icon.CheckCircle : Icon.Circle,
          tintColor: Color.Blue,
        }}
        actions={
          <ActionPanel>
            <Action
              title="Open Default Browser"
              icon={{ source: Icon.Globe, tintColor: Color.Blue }}
              shortcut={{ modifiers: ["ctrl"], key: "o" }}
              onAction={() => open("https://")}
            />
            <Action
              title="Retry Connection"
              onAction={reinitialize}
              icon={Icon.RotateClockwise}
              shortcut={{ modifiers: ["ctrl"], key: "r" }}
            />
          </ActionPanel>
        }
      />
    </List>
  );
}

export function LuckyOnboardingView() {
  return (
    <List.EmptyView
      icon={{ source: Icon.Brush, tintColor: Color.Magenta }}
      title="I'm Feeling Lucky"
      description="Type to search Google directly, bypassing local tabs."
    />
  );
}

export function LoadingTabsView() {
  return <List.EmptyView title="Loading Tabs..." icon={Icon.Download} />;
}

export function NoTabsFoundView() {
  return (
    <List.EmptyView
      title="No Tabs Found"
      description="Your browser is running but has no open tabs."
      icon={Icon.EyeDisabled}
    />
  );
}
