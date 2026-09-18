import {
  Action,
  ActionPanel,
  Icon,
  Keyboard,
  List,
  LocalStorage,
  closeMainWindow,
  environment,
  getPreferenceValues,
  open,
  showToast,
  Toast,
} from "@raycast/api";
import { execFile } from "node:child_process";
import { join } from "node:path";
import { promisify } from "node:util";
import { useCallback, useEffect, useMemo, useState } from "react";

const runFile = promisify(execFile);
const helper = join(environment.assetsPath, "menubar-helper");
const cacheKey = "menu-bar-items-v1";

type MenuItem = {
  pid: number;
  index: number;
  itemCount?: number;
  appName: string;
  title: string;
  bundlePath?: string;
  identifier?: string;
  role?: string;
  isSystemItem?: boolean;
  frame?: number[];
};
type Scan = { trusted: boolean; items: MenuItem[] };

export default function Command() {
  const { includeSystemItems } = getPreferenceValues<Preferences>();
  const [search, setSearch] = useState("");
  const [scan, setScan] = useState<Scan | null>(null);
  const [error, setError] = useState("");
  const [isRefreshing, setIsRefreshing] = useState(true);

  const refresh = useCallback(async () => {
    setError("");
    setIsRefreshing(true);
    try {
      const { stdout } = await runFile(helper, ["scan"], { timeout: 12000 });
      const nextScan = JSON.parse(stdout) as Scan;
      setScan(nextScan);
      if (nextScan.trusted)
        await LocalStorage.setItem(cacheKey, JSON.stringify(nextScan));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause));
    } finally {
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void (async () => {
      try {
        const cached = await LocalStorage.getItem<string>(cacheKey);
        if (cached) setScan(JSON.parse(cached) as Scan);
      } catch {
        /* A cache miss must never block a fresh scan. */
      }
      await refresh();
    })();
  }, [refresh]);

  const results = useMemo(() => {
    const q = search.trim().toLocaleLowerCase();
    const items = (scan?.items ?? []).filter(
      (item) =>
        includeSystemItems ||
        !(
          item.isSystemItem ||
          item.bundlePath === "/System/Library/CoreServices/MenuBarAgent.app"
        ),
    );
    if (!q) return items.slice(0, 40);
    return items
      .filter((item) =>
        `${item.appName} ${item.title}`.toLocaleLowerCase().includes(q),
      )
      .slice(0, 40);
  }, [search, scan, includeSystemItems]);

  async function activate(item: MenuItem) {
    try {
      await closeMainWindow();
      const { stdout } = await runFile(helper, [
        "press",
        String(item.pid),
        String(item.index),
        item.title,
        item.identifier ?? "",
        item.role ?? "",
        String(item.itemCount ?? 0),
        item.bundlePath ?? "",
      ]);
      const response = JSON.parse(stdout) as { ok: boolean; error?: string };
      if (!response.ok)
        throw new Error(response.error ?? "Could not open the menu bar icon.");
    } catch (cause) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Could Not Open Menu Bar Icon",
        message: cause instanceof Error ? cause.message : String(cause),
      });
    }
  }

  const emptyTitle =
    error && !scan
      ? "Could Not Read Menu Bar"
      : scan && !scan.trusted
        ? "Accessibility Access Required"
        : !scan
          ? "Loading Menu Bar Icons…"
          : "No Matches";

  return (
    <List
      isLoading={isRefreshing}
      searchBarPlaceholder="Search menu bar icons..."
      onSearchTextChange={setSearch}
      filtering={false}
    >
      {results.map((item) => (
        <List.Item
          key={`${item.pid}:${item.index}`}
          title={item.appName}
          subtitle={item.title === item.appName ? undefined : item.title}
          icon={
            item.bundlePath ? { fileIcon: item.bundlePath } : Icon.AppWindow
          }
          actions={
            <ActionPanel>
              <Action
                title="Open Menu Bar Icon"
                onAction={() => activate(item)}
              />
              <Action
                title="Refresh Items"
                shortcut={Keyboard.Shortcut.Common.Refresh}
                onAction={refresh}
              />
              <Action.CopyToClipboard
                title="Copy Item Details"
                content={JSON.stringify(item, null, 2)}
              />
            </ActionPanel>
          }
        />
      ))}
      {results.length === 0 && (
        <List.EmptyView
          title={emptyTitle}
          description={
            error ||
            (scan && !scan.trusted
              ? "Grant Accessibility access to the helper, then reopen this command."
              : undefined)
          }
          actions={
            scan && !scan.trusted ? (
              <ActionPanel>
                <Action
                  title="Open Accessibility Settings"
                  onAction={() =>
                    open(
                      "x-apple.systempreferences:com.apple.preference.security?Privacy_Accessibility",
                    )
                  }
                />
              </ActionPanel>
            ) : undefined
          }
        />
      )}
    </List>
  );
}
