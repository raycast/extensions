import {
  Action,
  ActionPanel,
  Alert,
  Color,
  Icon,
  List,
  Toast,
  Form,
  LocalStorage,
  confirmAlert,
  showToast,
  useNavigation,
} from "@raycast/api";
import { join } from "path";
import { existsSync } from "fs";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  launchSteamGame,
  listInstalledGamesForUser,
  getSteamInstallPath,
  getCurrentSteamUser,
  listSteamUsersSync,
  restartSteam,
  openSteam,
  logoutSteam,
  startSteamWithLogin,
  SteamUser,
} from "./utils/steam";
import { executeCommand, showFailure } from "./utils";

interface GameItem {
  id: string;
  title: string;
  subtitle?: string;
  appid: string;
  libraryPath: string;
  installdir: string;
}

export default function Command() {
  const [isLoading, setIsLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [items, setItems] = useState<GameItem[]>([]);
  const [users, setUsers] = useState<SteamUser[]>([]);
  const [current, setCurrent] = useState<SteamUser | undefined>(undefined);
  const [error, setError] = useState<string | undefined>(undefined);
  const [selectedId, setSelectedId] = useState<string | undefined>(undefined);
  const [nicknames, setNicknames] = useState<Record<string, string>>({});
  const [nicknamesVersion, setNicknamesVersion] = useState(0);
  const [refreshTick, setRefreshTick] = useState(0);
  const [forceUpdate, setForceUpdate] = useState(0);

  useEffect(() => {
    async function load() {
      setIsLoading(true);
      setError(undefined);
      try {
        const paths = await getSteamInstallPath();
        if (!paths) {
          setError("Steam installation not found. Is Steam installed?");
          setItems([]);
          setUsers([]);
          return;
        }
        const user = await getCurrentSteamUser(paths);
        if (!user) {
          setError(
            "Could not determine current Steam user. Log into Steam and try again.",
          );
          setItems([]);
          setUsers([]);
          return;
        }
        const games = listInstalledGamesForUser(
          paths.steamPath,
          user.steamId64,
        );
        const accs = listSteamUsersSync(paths).sort((a, b) =>
          (a.personaName || a.accountName).localeCompare(
            b.personaName || b.accountName,
          ),
        );
        const cur = await getCurrentSteamUser(paths);
        const mapped: GameItem[] = games
          .filter((g) => g.installed)
          .map((g) => ({
            id: g.appid,
            title: g.name,
            appid: g.appid,
            libraryPath: g.libraryPath,
            installdir: g.installdir,
          }))
          .sort((a, b) => a.title.localeCompare(b.title));
        // Prefer selecting the first game immediately so the initial selection isn't an action
        if (mapped.length > 0) {
          setSelectedId(mapped[0].id);
        }
        setItems(mapped);
        setUsers(accs);
        setCurrent(cur);
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : String(e);
        setError(msg || "Failed to list Steam games");
        setItems([]);
        setUsers([]);
      } finally {
        setIsLoading(false);
      }
    }
    load();
  }, []);

  // Load saved account nicknames from Raycast LocalStorage
  useEffect(() => {
    (async () => {
      try {
        const raw = await LocalStorage.getItem<string>("accountNicknames");
        if (raw) {
          const parsed = JSON.parse(raw) as Record<string, string>;
          setNicknames(parsed || {});
        }
      } catch {
        // ignore
      }
    })();
  }, []);

  function getNickname(u: SteamUser): string | undefined {
    return nicknames[u.steamId64];
  }

  function driveOf(p: string): string | undefined {
    const m = /^[A-Za-z]:/.exec(p);
    return m ? m[0].toUpperCase() : undefined;
  }

  function driveColor(drive: string): Color {
    const letter = drive[0]?.toUpperCase();
    switch (letter) {
      case "C":
        return Color.Green;
      case "D":
        return Color.Blue;
      case "E":
        return Color.Purple;
      case "F":
        return Color.Magenta;
      case "G":
        return Color.Orange;
      default:
        return Color.Yellow;
    }
  }

  // Derive unique Steam library root paths from listed games
  const libraryRoots = useMemo(() => {
    const set = new Set<string>();
    for (const it of items) {
      if (it.libraryPath) set.add(it.libraryPath);
    }
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [items]);

  async function openFolder(p: string) {
    // Using 'start' avoids Explorer returning a non-zero exit code even when it opens successfully
    await executeCommand(`start "" "${p}"`);
  }

  async function saveNicknames(next: Record<string, string>) {
    setNicknames(next);
    setNicknamesVersion((v) => v + 1);
    setRefreshTick((t) => t + 1);
    setForceUpdate((f) => f + 1);
    setUsers((prev) => [...prev]);
    await LocalStorage.setItem("accountNicknames", JSON.stringify(next));
  }

  // Workaround to force UI refresh after form-based nickname changes
  function forceUIRefreshAfterForm() {
    const currentQuery = query;
    // Insert invisible character
    setQuery(currentQuery + "\u200B");
    // Remove it after a brief delay to ensure state update completes
    setTimeout(() => setQuery(currentQuery), 10);
  }

  const filtered = useMemo(() => {
    if (!query) return items;
    const q = query.toLowerCase();
    return items.filter((i) => i.title.toLowerCase().includes(q));
  }, [items, query]);

  // Derive accounts with current nickname baked-in to force prop identity changes
  const accountsData = useMemo(
    () => users.map((u) => ({ u, nickname: nicknames[u.steamId64] || "" })),
    [users, nicknames, forceUpdate],
  );

  const filteredAccounts = useMemo(() => {
    if (!query) return accountsData;
    const q = query.toLowerCase();
    return accountsData.filter(({ u, nickname }) => {
      const persona = (u.personaName || "").toLowerCase();
      const account = (u.accountName || "").toLowerCase();
      const sid = (u.steamId64 || "").toLowerCase();
      const nick = nickname.toLowerCase();
      return (
        persona.includes(q) ||
        account.includes(q) ||
        sid.includes(q) ||
        nick.includes(q)
      );
    });
  }, [accountsData, query]);

  const actionItems = useMemo(() => {
    const base = [
      {
        key: "open",
        title: "Open Steam",
        icon: Icon.AppWindow,
        action: () => openSteam(),
      },
      {
        key: "restart",
        title: "Restart Steam",
        icon: Icon.ArrowClockwise,
        action: async () => {
          const ok = await confirmAlert({
            title: "Restart Steam?",
            primaryAction: {
              title: "Restart",
              style: Alert.ActionStyle.Destructive,
            },
            icon: Icon.ArrowClockwise,
          });
          if (!ok) return;
          await restartSteam();
        },
      },
    ];
    const libActions = libraryRoots.map((p, idx) => ({
      key: `open-common-${idx}`,
      title: `Open Game Files (${p})`,
      icon: Icon.Folder,
      action: async () => {
        const common = join(p, "steamapps", "common");
        await openFolder(common);
      },
    }));
    if (libActions.length === 0) {
      // Fallback to default Steam install path
      base.push({
        key: "open-common-default",
        title: "Open Game Files (Default)",
        icon: Icon.Folder,
        action: async () => {
          const paths = await getSteamInstallPath();
          if (paths) {
            await openFolder(join(paths.steamPath, "steamapps", "common"));
          }
        },
      });
    }
    return [...base, ...libActions];
  }, [libraryRoots]);

  const filteredActions = useMemo(() => {
    if (!query) return actionItems;
    const q = query.toLowerCase();
    return actionItems.filter((a) => a.title.toLowerCase().includes(q));
  }, [actionItems, query]);

  // Ensure selection starts at the very first item (Games > Accounts > Actions)
  const initialSelectionDone = useRef(false);
  useEffect(() => {
    if (initialSelectionDone.current) return;
    const firstGame = filtered[0]?.id;
    const firstAccount = filteredAccounts[0]
      ? `acc-${filteredAccounts[0].u.steamId64}`
      : undefined;
    const firstAction = filteredActions[0]
      ? `act-${filteredActions[0].key}`
      : undefined;
    const target = firstGame || firstAccount || firstAction;
    if (target && selectedId !== target) {
      setSelectedId(target);
      initialSelectionDone.current = true;
    }
  }, [filtered, filteredAccounts, filteredActions, selectedId]);

  async function onLaunch(appid: string) {
    try {
      await showToast({
        style: Toast.Style.Animated,
        title: "Launching game...",
      });
      await launchSteamGame(appid);
      await showToast({ style: Toast.Style.Success, title: "Launched" });
    } catch (e: unknown) {
      await showFailure(e, { title: "Launch failed" });
    }
  }

  async function onOpenFolder(g: GameItem) {
    const full = join(g.libraryPath, "steamapps", "common", g.installdir);
    try {
      if (!existsSync(full)) {
        await showFailure(`Folder not found: ${full}`, {
          title: "Folder not found",
        });
        return;
      }
      // Use Windows 'start' for better reliability from Node
      await executeCommand(`start "" "${full}"`);
    } catch (e: unknown) {
      await showFailure(e, { title: "Failed to open folder" });
    }
  }

  async function onSwitchAndRestart(accountName: string) {
    const ok = await confirmAlert({
      title: "Switch account (manual login)?",
      message: `This will log out of Steam and restart it. Log in as ${accountName} manually in Steam.`,
      icon: Icon.ArrowClockwise,
      primaryAction: {
        title: "Restart Steam",
        style: Alert.ActionStyle.Destructive,
      },
    });
    if (!ok) return;
    try {
      await showToast({
        style: Toast.Style.Animated,
        title: "Logging out and restarting Steam...",
      });
      await logoutSteam();
      await restartSteam();
      await showToast({ style: Toast.Style.Success, title: "Steam restarted" });
    } catch (e: unknown) {
      await showFailure(e, { title: "Failed to switch" });
    }
  }

  async function onPrefillLogin(accountName: string) {
    try {
      await showToast({
        style: Toast.Style.Animated,
        title: `Starting Steam for ${accountName}...`,
      });
      await startSteamWithLogin(accountName);
      await showToast({ style: Toast.Style.Success, title: "Steam started" });
    } catch (e: unknown) {
      await showFailure(e, { title: "Failed to start Steam" });
    }
  }

  return (
    <List
      key={`list-${refreshTick}`}
      isLoading={isLoading}
      searchBarPlaceholder="Search games, accounts, and actions"
      onSearchTextChange={setQuery}
      searchText={query}
      selectedItemId={selectedId}
      onSelectionChange={(id) => setSelectedId(id ?? undefined)}
    >
      {error && (
        <List.EmptyView
          title="Error"
          description={error}
          icon={{ source: Icon.ExclamationMark, tintColor: Color.Red }}
        />
      )}

      {filtered.length > 0 && (
        <List.Section title="Games">
          {filtered.map((g) => (
            <List.Item
              key={g.id}
              id={g.id}
              title={g.title}
              icon={Icon.GameController}
              accessories={[
                ...(driveOf(g.libraryPath)
                  ? [
                      {
                        tag: {
                          value: driveOf(g.libraryPath)!,
                          color: driveColor(driveOf(g.libraryPath)!),
                        },
                      },
                    ]
                  : []),
              ]}
              actions={
                <ActionPanel>
                  <Action
                    title="Launch"
                    icon={Icon.Play}
                    onAction={() => onLaunch(g.appid)}
                  />
                  <Action
                    title="Open Game Folder"
                    icon={Icon.Folder}
                    onAction={() => onOpenFolder(g)}
                  />
                  <Action.CopyToClipboard
                    title="Copy App Id"
                    content={g.appid}
                  />
                </ActionPanel>
              }
            />
          ))}
        </List.Section>
      )}

      {filtered.length === 0 && !isLoading && (
        <List.EmptyView
          title="No games found"
          description="Check Steam libraries and retry"
        />
      )}

      <List.Section title="Accounts" key={`accounts-${nicknamesVersion}`}>
        {filteredAccounts.map(({ u, nickname }) => (
          <List.Item
            key={`${u.steamId64}:${nickname}`}
            id={`acc-${u.steamId64}`}
            title={`${u.personaName || u.accountName}`}
            subtitle={u.accountName}
            accessories={[
              ...(u.mostRecent
                ? [{ tag: { value: "Current", color: Color.Green } }]
                : []),
              ...(nickname
                ? [
                    {
                      tag: {
                        value: `Nickname: ${nickname}`,
                        color: Color.Orange,
                      },
                    },
                  ]
                : []),
              ...(u.rememberPassword
                ? [{ tag: { value: "Remember Password", color: Color.Blue } }]
                : []),
            ]}
            icon={u.mostRecent ? Icon.PersonCircle : Icon.Person}
            actions={
              <ActionPanel>
                <Action
                  title="Switch (prefill Username)"
                  icon={Icon.Person}
                  onAction={() => onPrefillLogin(u.accountName)}
                />
                <Action
                  title="Switch (logout and Restart)"
                  icon={Icon.ArrowClockwise}
                  onAction={() => onSwitchAndRestart(u.accountName)}
                />
                <Action.OpenInBrowser
                  title="Open Steam"
                  url="steam://open/main"
                  onOpen={async () => openSteam()}
                />
                {libraryRoots.length <= 1 ? (
                  <Action
                    title="Open Game Files"
                    icon={Icon.Folder}
                    onAction={async () => {
                      const root = libraryRoots[0];
                      if (root) {
                        await openFolder(join(root, "steamapps", "common"));
                      } else {
                        const paths = await getSteamInstallPath();
                        if (paths) {
                          await openFolder(
                            join(paths.steamPath, "steamapps", "common"),
                          );
                        }
                      }
                    }}
                  />
                ) : (
                  <ActionPanel.Submenu
                    title="Open Game Files"
                    icon={Icon.Folder}
                  >
                    {libraryRoots.map((p) => (
                      <Action
                        key={`open-common-${p}`}
                        title={p}
                        icon={Icon.Folder}
                        onAction={async () =>
                          openFolder(join(p, "steamapps", "common"))
                        }
                      />
                    ))}
                  </ActionPanel.Submenu>
                )}
                <Action.CopyToClipboard
                  title="Copy Account Name"
                  content={u.accountName}
                />
                <Action.CopyToClipboard
                  title="Copy Steamid64"
                  content={u.steamId64}
                />
                {getNickname(u) && (
                  <Action.CopyToClipboard
                    title="Copy Nickname"
                    content={getNickname(u)!}
                  />
                )}
                <ActionPanel.Section title="Account Nickname">
                  <Action.Push
                    title={getNickname(u) ? "Edit Nickname" : "Set Nickname"}
                    icon={Icon.Tag}
                    target={
                      <NicknameForm
                        user={u}
                        nickname={getNickname(u)}
                        onSave={async (nickname) => {
                          const next = { ...nicknames };
                          if (nickname && nickname.trim().length > 0) {
                            next[u.steamId64] = nickname.trim();
                          } else {
                            delete next[u.steamId64];
                          }
                          await saveNicknames(next);
                          // Force UI refresh
                          setUsers((prev) => [...prev]);
                          // Workaround: Force UI refresh after form-based changes
                          forceUIRefreshAfterForm();
                        }}
                      />
                    }
                  />
                  {getNickname(u) && (
                    <Action
                      title="Clear Nickname"
                      icon={Icon.Trash}
                      style={Action.Style.Destructive}
                      onAction={async () => {
                        const next = { ...nicknames };
                        delete next[u.steamId64];
                        await saveNicknames(next);
                        await showToast({
                          style: Toast.Style.Success,
                          title: "Nickname cleared",
                        });
                        // force list to refresh immediately
                        setUsers((prev) => [...prev]);
                      }}
                    />
                  )}
                </ActionPanel.Section>
                {current && (
                  <Action.CopyToClipboard
                    title="Copy Current Steamid64"
                    content={current.steamId64}
                  />
                )}
              </ActionPanel>
            }
          />
        ))}
      </List.Section>

      {!isLoading && (
        <List.Section title="Steam Actions">
          {filteredActions.map((a) => (
            <List.Item
              key={a.key}
              id={`act-${a.key}`}
              title={a.title}
              icon={a.icon}
              actions={
                <ActionPanel>
                  <Action title={a.title} onAction={a.action} />
                </ActionPanel>
              }
            />
          ))}
        </List.Section>
      )}
    </List>
  );
}

function NicknameForm(props: {
  user: SteamUser;
  nickname?: string;
  onSave: (nickname?: string) => void | Promise<void>;
}) {
  const { user, nickname, onSave } = props;
  const { pop } = useNavigation();
  return (
    <Form
      navigationTitle={`Set Nickname — ${user.personaName || user.accountName}`}
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="Save Nickname"
            onSubmit={async (vals: { nickname?: string }) => {
              // Pop immediately to get back to main list
              pop();
              // Then do the save in the background
              try {
                await onSave(vals.nickname);
                await showToast({
                  style: Toast.Style.Success,
                  title: "Nickname saved",
                });
              } catch (e: unknown) {
                await showFailure(e, { title: "Failed to save nickname" });
              }
            }}
          />
        </ActionPanel>
      }
    >
      <Form.Description text="Give this account a friendly name to make searching easier." />
      <Form.TextField
        id="nickname"
        title="Nickname"
        placeholder="e.g. Main, Alt, Family"
        defaultValue={nickname}
      />
      <Form.Description
        text={`Account: ${user.accountName} • SteamID64: ${user.steamId64}`}
      />
    </Form>
  );
}
