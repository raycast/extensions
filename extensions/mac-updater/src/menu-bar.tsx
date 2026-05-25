import { Icon, launchCommand, LaunchType, MenuBarExtra } from "@raycast/api";
import { useEffect, useState } from "react";
import { scanAll, ScanResult } from "./utils/coordinator";
import { loadScanCache, saveScanCache } from "./utils/scan-cache";
import { getAdoptableApps } from "./utils/adoption";

export default function MenuBar() {
  const [scan, setScan] = useState<ScanResult | null>(null);
  const [adoptableCount, setAdoptableCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshedAt, setRefreshedAt] = useState<number | null>(null);

  useEffect(() => {
    void refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function refresh() {
    // Render the cached value first so the menu bar updates instantly on relaunch
    const cached = loadScanCache();
    if (cached) {
      setScan(cached.scan);
      setAdoptableCount((await getAdoptableApps(cached.scan)).length);
      setRefreshedAt(Date.now() - cached.age);
      setIsLoading(false);
    }
    // Always run a fresh scan in the background so the menu bar reflects reality
    try {
      const fresh = await scanAll();
      setScan(fresh);
      saveScanCache(fresh);
      setAdoptableCount((await getAdoptableApps(fresh)).length);
      setRefreshedAt(Date.now());
    } catch {
      // ignore — keep showing cached data
    } finally {
      setIsLoading(false);
    }
  }

  const appUpdates = scan?.apps.filter((a) => a.hasUpdate) ?? [];
  const pkgUpdates = scan?.cliPackages ?? [];
  const totalUpdates = appUpdates.length + pkgUpdates.length;

  // Icon + title strategy:
  //  - 0 updates → just the icon, no count (low visual noise)
  //  - 1+ updates → icon + count as title text
  const title = totalUpdates > 0 ? String(totalUpdates) : undefined;

  // Tooltip
  const tooltip = (() => {
    if (isLoading && !scan) return "Mac Updater · scanning…";
    if (!scan) return "Mac Updater";
    if (totalUpdates === 0 && adoptableCount === 0) return "All up to date";
    const parts: string[] = [];
    if (totalUpdates > 0)
      parts.push(`${totalUpdates} update${totalUpdates === 1 ? "" : "s"}`);
    if (adoptableCount > 0) parts.push(`${adoptableCount} adoptable`);
    return parts.join(" · ");
  })();

  async function openMain() {
    try {
      await launchCommand({
        name: "mac-updater",
        type: LaunchType.UserInitiated,
      });
    } catch {
      /* ignore */
    }
  }

  async function openUpdateAll() {
    try {
      await launchCommand({
        name: "update-everything",
        type: LaunchType.UserInitiated,
      });
    } catch {
      /* ignore */
    }
  }

  return (
    <MenuBarExtra
      icon={totalUpdates > 0 ? Icon.ArrowUpCircleFilled : Icon.CheckCircle}
      title={title}
      tooltip={tooltip}
      isLoading={isLoading && !scan}
    >
      {totalUpdates === 0 && (
        <MenuBarExtra.Item
          title="Everything is up to date"
          icon={Icon.Checkmark}
        />
      )}

      {appUpdates.length > 0 && (
        <MenuBarExtra.Section title={`App Updates (${appUpdates.length})`}>
          {appUpdates.slice(0, 15).map((info) => (
            <MenuBarExtra.Item
              key={info.app.appPath}
              title={info.app.name}
              subtitle={`${info.app.version} → ${info.latestVersion}`}
              icon={{ fileIcon: info.app.appPath }}
              onAction={openMain}
            />
          ))}
          {appUpdates.length > 15 && (
            <MenuBarExtra.Item
              title={`+ ${appUpdates.length - 15} more in Mac Updater…`}
              onAction={openMain}
            />
          )}
        </MenuBarExtra.Section>
      )}

      {pkgUpdates.length > 0 && (
        <MenuBarExtra.Section title={`Package Updates (${pkgUpdates.length})`}>
          {pkgUpdates.slice(0, 8).map((p) => (
            <MenuBarExtra.Item
              key={`${p.source}-${p.id}`}
              title={p.name}
              subtitle={`${p.source} · ${p.currentVersion} → ${p.latestVersion}`}
              onAction={openMain}
            />
          ))}
          {pkgUpdates.length > 8 && (
            <MenuBarExtra.Item
              title={`+ ${pkgUpdates.length - 8} more…`}
              onAction={openMain}
            />
          )}
        </MenuBarExtra.Section>
      )}

      {adoptableCount > 0 && (
        <MenuBarExtra.Section>
          <MenuBarExtra.Item
            title={`${adoptableCount} app${adoptableCount === 1 ? "" : "s"} could be adopted to Homebrew`}
            icon={Icon.Mug}
            onAction={openMain}
          />
        </MenuBarExtra.Section>
      )}

      <MenuBarExtra.Section>
        {totalUpdates > 0 && (
          <MenuBarExtra.Item
            title="Update Everything"
            icon={Icon.Rocket}
            onAction={openUpdateAll}
            shortcut={{ modifiers: ["cmd", "shift"], key: "u" }}
          />
        )}
        <MenuBarExtra.Item
          title="Open Mac Updater"
          icon={Icon.AppWindow}
          onAction={openMain}
        />
        <MenuBarExtra.Item
          title={
            refreshedAt
              ? `Refresh · last scan ${formatAgo(Date.now() - refreshedAt)} ago`
              : "Refresh"
          }
          icon={Icon.RotateClockwise}
          onAction={refresh}
        />
      </MenuBarExtra.Section>
    </MenuBarExtra>
  );
}

function formatAgo(ms: number): string {
  const sec = Math.floor(ms / 1000);
  if (sec < 60) return `${sec}s`;
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min} min`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h`;
  return `${Math.floor(hr / 24)}d`;
}
