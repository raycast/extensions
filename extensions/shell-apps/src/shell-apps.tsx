import {
  Action,
  ActionPanel,
  Alert,
  Detail,
  Icon,
  Keyboard,
  List,
  Toast,
  closeMainWindow,
  confirmAlert,
  showHUD,
  showToast,
} from "@raycast/api";
import { randomUUID } from "crypto";
import { useEffect, useRef, useState } from "react";
import CreateAppForm from "./create-app";
import { appDeeplink } from "./lib/deeplink";
import { iconByName } from "./lib/icons";
import { deleteApp, getAppByName, getApps, upsertApp } from "./lib/store";
import { launchApp } from "./lib/terminal";
import { TERMINAL_LABELS, type ShellApp } from "./lib/types";

interface CommandArguments {
  app?: string;
}

export default function Command(props: { arguments: CommandArguments }) {
  const { app: launchArgument } = props.arguments;
  const [apps, setApps] = useState<ShellApp[] | null>(null);
  const [searchText, setSearchText] = useState("");

  const reload = async () => setApps(await getApps());

  const launchedRef = useRef(false);

  useEffect(() => {
    if (launchArgument && !launchedRef.current) {
      launchedRef.current = true;
      void handleLaunchFromArgument(launchArgument);
      return;
    }
    void reload();
  }, []);

  async function handleLaunchFromArgument(name: string) {
    const found = await getAppByName(name);
    if (!found) {
      await showToast({
        style: Toast.Style.Failure,
        title: "App not found",
        message: `"${name}" is not configured yet.`,
      });
      return;
    }
    await showHUD(`Launching ${found.name}…`);
    const error = await launchApp(found);
    if (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: `Failed to launch ${found.name}`,
        message: error,
      });
    } else {
      await closeMainWindow({ clearRootSearch: true });
    }
  }

  async function handleLaunch(app: ShellApp) {
    const error = await launchApp(app);
    if (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: `Failed to launch ${app.name}`,
        message: error,
      });
    } else {
      await showHUD(`Launched ${app.name}`);
      await closeMainWindow({ clearRootSearch: true });
    }
  }

  async function handleDuplicate(app: ShellApp) {
    const apps = await getApps();
    const used = new Set(apps.map((item) => item.name.toLowerCase()));
    const base = `${app.name} Copy`;
    let name = base;
    let counter = 2;
    while (used.has(name.toLowerCase())) {
      name = `${base} ${counter}`;
      counter += 1;
    }
    await upsertApp({
      ...app,
      id: randomUUID(),
      name,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });
    await reload();
    await showHUD(`Duplicated ${app.name}`);
  }

  async function handleDelete(app: ShellApp) {
    const confirmed = await confirmAlert({
      title: `Delete ${app.name}?`,
      message: "This will remove the shell app shortcut.",
      primaryAction: { style: Alert.ActionStyle.Destructive, title: "Delete" },
    });
    if (!confirmed) return;
    await deleteApp(app.id);
    await reload();
  }

  if (launchArgument) {
    return <Detail markdown={`Launching **${launchArgument}**…`} />;
  }

  const filtered = (apps ?? []).filter((app) => {
    const query = searchText.trim().toLowerCase();
    if (!query) return true;
    return (
      app.name.toLowerCase().includes(query) ||
      app.command.toLowerCase().includes(query) ||
      (TERMINAL_LABELS[app.terminal] ?? "").toLowerCase().includes(query)
    );
  });

  return (
    <List isLoading={apps === null} searchBarPlaceholder="Search shell apps…" onSearchTextChange={setSearchText}>
      {filtered.map((app) => (
        <List.Item
          key={app.id}
          title={app.name}
          subtitle={app.command}
          icon={iconByName(app.icon)}
          accessories={[
            ...(app.runAsAdmin ? [{ icon: Icon.Shield, tooltip: "Runs as administrator" }] : []),
            { text: TERMINAL_LABELS[app.terminal] },
          ]}
          actions={
            <ActionPanel>
              <Action title="Launch" icon={Icon.Play} onAction={() => handleLaunch(app)} />
              <Action.Push
                title="Edit"
                icon={Icon.Pencil}
                target={<CreateAppForm app={app} onSaved={reload} />}
                shortcut={Keyboard.Shortcut.Common.Edit}
              />
              <Action.CreateQuicklink
                title="Create Quicklink"
                quicklink={{
                  name: app.name,
                  link: appDeeplink(app.name),
                  icon: iconByName(app.icon),
                }}
              />
              <Action
                title="Duplicate"
                icon={Icon.CopyClipboard}
                onAction={() => handleDuplicate(app)}
                shortcut={{ modifiers: ["cmd"], key: "d" }}
              />
              <Action.CopyToClipboard
                title="Copy Command"
                content={app.command}
                shortcut={Keyboard.Shortcut.Common.Copy}
              />
              <Action
                title="Delete"
                icon={Icon.Trash}
                style={Action.Style.Destructive}
                onAction={() => handleDelete(app)}
                shortcut={{ modifiers: ["cmd", "shift"], key: "backspace" }}
              />
              <Action.Push
                title="Create Shell App"
                icon={Icon.Plus}
                target={<CreateAppForm onSaved={reload} />}
                shortcut={Keyboard.Shortcut.Common.New}
              />
            </ActionPanel>
          }
        />
      ))}
      {apps !== null && filtered.length === 0 ? (
        <List.EmptyView
          title="No shell apps yet"
          description="Create your first shell command shortcut"
          actions={
            <ActionPanel>
              <Action.Push title="Create Shell App" icon={Icon.Plus} target={<CreateAppForm onSaved={reload} />} />
            </ActionPanel>
          }
        />
      ) : null}
    </List>
  );
}
