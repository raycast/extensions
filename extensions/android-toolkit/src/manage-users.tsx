import {
  ActionPanel,
  Action,
  List,
  Icon,
  showToast,
  Toast,
} from "@raycast/api";
import { usePromise } from "@raycast/utils";
import {
  getUsers,
  getPackages,
  AdbUser,
  clearAppData,
  uninstallApp,
} from "./utils/adb";
import { openTerminalWithCommand } from "./utils/terminal";
import { getErrorMessage } from "./utils/errors";

export default function Command() {
  const {
    isLoading,
    data: users,
    error,
    revalidate,
  } = usePromise(getUsers, []);

  if (error) {
    showToast({
      style: Toast.Style.Failure,
      title: "Failed to get users",
      message: error.message,
    });
  }

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Search users...">
      {users?.map((user) => (
        <List.Item
          key={user.id}
          icon={Icon.Person}
          title={user.name}
          subtitle={`User ID: ${user.id}`}
          accessories={[{ text: user.running ? "Running" : "Stopped" }]}
          actions={
            <ActionPanel>
              <Action.Push title="View Apps" target={<AppList user={user} />} />
              <Action
                title="Reload Users"
                shortcut={{ modifiers: ["cmd"], key: "r" }}
                onAction={revalidate}
              />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}

function AppList({ user }: { user: AdbUser }) {
  const {
    isLoading,
    data: packages,
    error,
    revalidate,
  } = usePromise(getPackages, [user.id]);

  if (error) {
    showToast({
      style: Toast.Style.Failure,
      title: "Failed to get packages",
      message: error.message,
    });
  }

  async function handleClearData(pkg: string) {
    try {
      await clearAppData(pkg);
      showToast(Toast.Style.Success, "App data cleared");
    } catch (error) {
      showToast(
        Toast.Style.Failure,
        "Failed to clear data",
        getErrorMessage(error),
      );
    }
  }

  async function handleUninstall(pkg: string) {
    try {
      await uninstallApp(pkg, user.id);
      showToast(Toast.Style.Success, "App uninstalled");
      revalidate();
    } catch (error) {
      showToast(
        Toast.Style.Failure,
        "Failed to uninstall",
        getErrorMessage(error),
      );
    }
  }

  async function handleOpenLogs(pkg: string) {
    try {
      // Find PID first or just use logcat with grep. Grep is easier and persistent across restarts.
      await openTerminalWithCommand(`adb logcat | grep -i ${pkg}`);
      showToast(Toast.Style.Success, "Opened logs in Terminal");
    } catch (error) {
      showToast(
        Toast.Style.Failure,
        "Failed to open logs",
        getErrorMessage(error),
      );
    }
  }

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Search apps...">
      {packages?.map((p) => (
        <List.Item
          key={p.pkg}
          icon={Icon.AppWindow}
          title={p.name}
          subtitle={p.pkg}
          keywords={[p.pkg, ...p.pkg.split(".")]}
          actions={
            <ActionPanel>
              <Action
                title="Open Logs in Terminal"
                icon={Icon.Terminal}
                onAction={() => handleOpenLogs(p.pkg)}
              />
              <Action
                title="Clear App Data"
                icon={Icon.Trash}
                shortcut={{ modifiers: ["cmd", "shift"], key: "backspace" }}
                onAction={() => handleClearData(p.pkg)}
              />
              <Action
                title="Uninstall App"
                icon={Icon.DeleteDocument}
                style={Action.Style.Destructive}
                shortcut={{ modifiers: ["ctrl"], key: "x" }}
                onAction={() => handleUninstall(p.pkg)}
              />
              <Action
                title="Reload Apps"
                shortcut={{ modifiers: ["cmd"], key: "r" }}
                onAction={revalidate}
              />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
