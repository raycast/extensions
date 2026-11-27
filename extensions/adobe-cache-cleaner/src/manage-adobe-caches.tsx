import {
  Action,
  ActionPanel,
  Clipboard,
  Color,
  Icon,
  Keyboard,
  List,
  openExtensionPreferences,
  showToast,
  Toast,
} from "@raycast/api";
import { showFailureToast, useCachedPromise } from "@raycast/utils";
import {
  APPS,
  AppId,
  CacheLocation,
  detectedCustomPaths,
  discoverLocations,
  GROUPS,
  installedApps,
  tildify,
} from "./locations";
import { appNames, confirmAndPurge, formatBytes, measure, outcomeMessage, outcomeTitle, runningApps } from "./purge";

type SizedLocation = CacheLocation & { bytes: number };

interface Scan {
  locations: SizedLocation[];
  running: AppId[];
  appPaths: Partial<Record<AppId, string>>;
}

async function scan(): Promise<Scan> {
  const [{ locations, issues }, running, appPaths] = await Promise.all([
    discoverLocations(),
    runningApps(),
    installedApps(),
  ]);
  if (issues.length) {
    await showFailureToast(new Error(issues.map((i) => `${i.input}: ${i.reason}`).join("\n")), {
      title: "Some extra folders were skipped",
    });
  }
  const sized = await Promise.all(locations.map(async (l) => ({ ...l, bytes: await measure(l.targets) })));
  return { locations: sized.filter((l) => l.bytes > 0), running: [...running], appPaths };
}

export default function Command() {
  const { data, isLoading, error, revalidate } = useCachedPromise(scan, [], { keepPreviousData: true });
  const locations = data?.locations ?? [];
  const running = new Set(data?.running);
  const appPaths = data?.appPaths ?? {};
  const sizes = new Map(locations.map((l) => [l.id, l.bytes]));
  const total = locations.reduce((sum, l) => sum + l.bytes, 0);

  async function purge(targets: CacheLocation[], bulk: boolean) {
    // Cached rows can be out of date until the fresh scan lands.
    if (isLoading) {
      await showToast({ style: Toast.Style.Failure, title: "Still scanning", message: "Try again in a moment." });
      return;
    }
    const outcome = await confirmAndPurge(targets, sizes, bulk);
    if (!outcome) return;
    await showToast({
      style: outcome.failures.length ? Toast.Style.Failure : Toast.Style.Success,
      title: outcomeTitle(outcome),
      message: outcomeMessage(outcome),
    });
    revalidate();
  }

  async function copyDetected() {
    const paths = await detectedCustomPaths();
    if (!paths.length) {
      await showToast({
        style: Toast.Style.Success,
        title: "Nothing custom to copy",
        message: "Adobe's preferences point to the default cache locations, which are already covered.",
      });
      return;
    }
    await Clipboard.copy(paths.join("; "));
    await showToast({
      style: Toast.Style.Success,
      title: `Copied ${paths.length} location(s)`,
      message: "Paste them into Extra Cache Folders in the extension settings.",
      primaryAction: { title: "Open Extension Settings", onAction: () => openExtensionPreferences() },
    });
  }

  const sections = GROUPS.map((group) => ({
    group,
    items: locations.filter((l) => l.group === group).sort((a, b) => b.bytes - a.bytes),
  })).filter((s) => s.items.length);

  return (
    <List isLoading={isLoading} searchBarPlaceholder={`Filter caches (${formatBytes(total)} total)`}>
      <List.EmptyView
        icon={error ? Icon.Warning : Icon.CheckCircle}
        title={error ? "Couldn't Scan Adobe Caches" : "Nothing to Purge"}
        description={error ? error.message : "All Adobe caches are empty."}
        actions={
          <ActionPanel>
            <Action title="Retry" icon={Icon.ArrowClockwise} onAction={revalidate} />
            <Action title="Open Extension Settings" icon={Icon.Gear} onAction={openExtensionPreferences} />
          </ActionPanel>
        }
      />
      {sections.map(({ group, items }) => (
        <List.Section key={group} title={group} subtitle={formatBytes(items.reduce((s, l) => s + l.bytes, 0))}>
          {items.map((loc) => {
            const open = loc.owners.filter((o) => running.has(o));
            const accessories: List.Item.Accessory[] = [];
            if (open.length)
              accessories.push({
                tag: { value: `${appNames(open)} open`, color: Color.Orange },
                tooltip: "Unsafe while the app is running — purging will ask first",
              });
            if (loc.detected)
              accessories.push({
                tag: { value: "from Adobe prefs", color: Color.Blue },
                tooltip: "Custom location read from Adobe's preferences",
              });
            accessories.push({ text: formatBytes(loc.bytes) });
            for (const id of loc.owners) {
              const app = appPaths[id];
              if (app) accessories.push({ icon: { fileIcon: app }, tooltip: APPS[id].name });
            }

            return (
              <List.Item
                key={loc.id}
                icon={{ source: Icon.Folder, tintColor: open.length ? Color.Orange : Color.SecondaryText }}
                title={loc.title}
                subtitle={tildify(loc.displayPath)}
                keywords={[loc.group, ...(loc.note ? [loc.note] : [])]}
                accessories={accessories}
                actions={
                  <ActionPanel>
                    <ActionPanel.Section>
                      <Action
                        title={`Purge ${loc.title}`}
                        icon={Icon.Trash}
                        style={Action.Style.Destructive}
                        onAction={() => purge([loc], false)}
                      />
                      <Action
                        title={`Purge All (${formatBytes(total)})`}
                        icon={Icon.Trash}
                        style={Action.Style.Destructive}
                        shortcut={Keyboard.Shortcut.Common.RemoveAll}
                        onAction={() => purge(locations, true)}
                      />
                    </ActionPanel.Section>
                    <ActionPanel.Section>
                      <Action.ShowInFinder path={loc.displayPath} />
                      <Action.CopyToClipboard
                        title="Copy Path"
                        content={loc.displayPath}
                        shortcut={Keyboard.Shortcut.Common.CopyPath}
                      />
                      <Action
                        title="Refresh"
                        icon={Icon.ArrowClockwise}
                        shortcut={Keyboard.Shortcut.Common.Refresh}
                        onAction={revalidate}
                      />
                    </ActionPanel.Section>
                    <ActionPanel.Section title="Settings">
                      <Action
                        title="Copy Detected Locations"
                        icon={Icon.MagnifyingGlass}
                        shortcut={{ modifiers: ["cmd", "shift"], key: "d" }}
                        onAction={copyDetected}
                      />
                      <Action title="Open Extension Settings" icon={Icon.Gear} onAction={openExtensionPreferences} />
                    </ActionPanel.Section>
                  </ActionPanel>
                }
              />
            );
          })}
        </List.Section>
      ))}
    </List>
  );
}
