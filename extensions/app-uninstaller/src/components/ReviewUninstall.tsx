import {
  Action,
  ActionPanel,
  Alert,
  Color,
  confirmAlert,
  Icon,
  List,
  open,
  showToast,
  Toast,
  useNavigation,
  Keyboard,
} from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { useEffect, useMemo, useState } from "react";
import { quitApp, quitAppNamed, type InstalledApp } from "../lib/apps";
import { AuthorizationCancelled, trashAsAdmin } from "../lib/elevate";
import { listNames } from "../lib/inuse";
import { formatBytes, tildify } from "../lib/format";
import type { Confidence } from "../lib/match";
import {
  buildAdminCommand,
  buildForgetCommand,
  buildTrashCommand,
  moveToTrash,
  type RemovalFailure,
} from "../lib/remove";
import { scanApp, type Leftover } from "../lib/scan";

const CONFIDENCE_COLOR: Record<Confidence, Color> = {
  high: Color.Green,
  medium: Color.Yellow,
  low: Color.Orange,
};

const CONFIDENCE_LABEL: Record<Confidence, string> = {
  high: "Certain",
  medium: "Likely",
  low: "Unsure",
};

const SECTIONS: { confidence: Confidence; title: string; subtitle: string }[] = [
  { confidence: "high", title: "Certain", subtitle: "Matched by bundle identifier" },
  { confidence: "medium", title: "Likely", subtitle: "Matched by application name" },
  { confidence: "low", title: "Unsure", subtitle: "Check these before selecting them" },
];

/**
 * Items we are confident about are pre-selected; the rest are an opt-in.
 *
 * This applies to items needing administrator rights too. They are removed by a
 * separate action, but that action must not quietly include an unsure match just
 * because it happens to be root-owned — least of all while running as root.
 */
function defaultSelection(items: Leftover[]): Set<string> {
  return new Set(items.filter((item) => item.confidence !== "low").map((item) => item.path));
}

export function ReviewUninstall({
  app,
  allApps,
  onFinished,
}: {
  app: InstalledApp;
  allApps: InstalledApp[];
  onFinished: () => void;
}) {
  const { pop } = useNavigation();
  const { data, isLoading, revalidate } = usePromise(scanApp, [app, allApps]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [initialized, setInitialized] = useState(false);
  const [failures, setFailures] = useState<Map<string, RemovalFailure>>(new Map());

  const removable = useMemo(
    () => (data ? [...(data.bundle ? [data.bundle] : []), ...data.leftovers].filter((item) => !item.needsAdmin) : []),
    [data],
  );
  const adminOnly = useMemo(
    () => (data ? [...(data.bundle ? [data.bundle] : []), ...data.leftovers].filter((item) => item.needsAdmin) : []),
    [data],
  );

  useEffect(() => {
    if (data && !initialized) {
      setSelected(defaultSelection([...removable, ...adminOnly]));
      setInitialized(true);
    }
  }, [data, initialized, removable, adminOnly]);

  const chosen = removable.filter((item) => selected.has(item.path));
  const chosenSize = chosen.reduce((total, item) => total + item.size, 0);
  const chosenAdmin = adminOnly.filter((item) => selected.has(item.path));

  function toggle(path: string) {
    setSelected((current) => {
      const next = new Set(current);
      if (!next.delete(path)) next.add(path);
      return next;
    });
  }

  async function performRemoval(items: Leftover[], { confirm = true } = {}) {
    if (items.length === 0) {
      await showToast({ style: Toast.Style.Failure, title: "Nothing selected" });
      return;
    }

    const size = items.reduce((total, item) => total + item.size, 0);

    if (confirm) {
      const confirmed = await confirmAlert({
        title: `Move ${items.length} item${items.length === 1 ? "" : "s"} to the Trash?`,
        message: `${formatBytes(size)} from ${app.name}. Nothing is deleted outright — you can restore everything from the Trash.`,
        icon: Icon.Trash,
        primaryAction: { title: "Move to Trash", style: Alert.ActionStyle.Destructive },
      });
      if (!confirmed) return;
    }

    if (data?.isRunning) {
      await showToast({ style: Toast.Style.Animated, title: `Quitting ${app.name}…` });
      await quitApp(app);
    }

    const toast = await showToast({ style: Toast.Style.Animated, title: "Moving to the Trash…" });
    const outcome = await moveToTrash(items);

    // Whatever succeeded is gone; drop it from the selection either way.
    setSelected((current) => {
      const next = new Set(current);
      for (const path of outcome.trashed) next.delete(path);
      return next;
    });
    setFailures(new Map(outcome.failed.map((failure) => [failure.path, failure])));

    if (outcome.failed.length === 0) {
      toast.style = Toast.Style.Success;
      toast.title = `Moved ${outcome.trashed.length} item${outcome.trashed.length === 1 ? "" : "s"} to the Trash`;
      toast.message = formatBytes(size);
      onFinished();
      pop();
      return;
    }

    toast.style = Toast.Style.Failure;
    toast.title = `${outcome.failed.length} of ${items.length} could not be removed`;
    toast.message = outcome.failed[0].reason;
    onFinished();
  }

  async function performAdminRemoval(items: Leftover[]) {
    if (items.length === 0) return;
    const size = items.reduce((total, item) => total + item.size, 0);

    const confirmed = await confirmAlert({
      title: `Move ${items.length} item${items.length === 1 ? "" : "s"} to the Trash as administrator?`,
      message:
        `${items.map((item) => item.path).join("\n")}\n\n` +
        `${formatBytes(size)} owned by root. macOS will ask for your password — it handles that itself, and the extension never sees it. ` +
        `The files are moved to the Trash, not deleted.`,
      icon: Icon.Lock,
      primaryAction: { title: "Authenticate and Move", style: Alert.ActionStyle.Destructive },
    });
    if (!confirmed) return;

    const toast = await showToast({ style: Toast.Style.Animated, title: "Waiting for authentication…" });

    try {
      await trashAsAdmin(
        items.map((item) => item.path),
        app.name,
      );
      toast.style = Toast.Style.Success;
      toast.title = `Moved ${items.length} item${items.length === 1 ? "" : "s"} to the Trash`;
      toast.message = formatBytes(size);
      onFinished();
      revalidate();
    } catch (error) {
      if (error instanceof AuthorizationCancelled) {
        toast.style = Toast.Style.Failure;
        toast.title = "Cancelled";
        toast.message = "Nothing was removed";
        return;
      }
      toast.style = Toast.Style.Failure;
      toast.title = "Could not remove as administrator";
      toast.message = error instanceof Error ? error.message : String(error);
    }
  }

  const failedItems = removable.filter((item) => failures.has(item.path));
  const pending = removable.filter((item) => !failures.has(item.path));
  const adminCommand = buildAdminCommand(adminOnly);
  const forgetCommand = buildForgetCommand(data?.packageReceipts ?? []);

  function itemActions(item: Leftover, selectable: boolean) {
    const failure = failures.get(item.path);
    const failedCommand = buildTrashCommand(failedItems.map((entry) => entry.path));

    return (
      <ActionPanel>
        {item.needsAdmin && (
          <Action
            icon={selected.has(item.path) ? Icon.Circle : Icon.CheckCircle}
            title={selected.has(item.path) ? "Deselect" : "Select"}
            onAction={() => toggle(item.path)}
          />
        )}
        {item.needsAdmin && (
          <Action
            icon={Icon.Lock}
            title={`Move ${chosenAdmin.length} Selected to Trash as Administrator`}
            style={Action.Style.Destructive}
            shortcut={{ modifiers: ["cmd", "shift"], key: "return" }}
            onAction={() => performAdminRemoval(chosenAdmin)}
          />
        )}
        {failure?.settingsUrl && failure.settingsLabel && (
          <Action
            icon={Icon.Gear}
            title={failure.settingsLabel}
            onAction={async () => {
              await open(failure.settingsUrl as string);
              await showToast({
                style: Toast.Style.Success,
                title: "Opened System Settings",
                message: `Turn on Raycast, then retry with ⌘Y`,
              });
            }}
          />
        )}
        {selectable && (
          <Action
            icon={selected.has(item.path) ? Icon.Circle : Icon.CheckCircle}
            title={selected.has(item.path) ? "Deselect" : "Select"}
            onAction={() => toggle(item.path)}
          />
        )}
        <Action
          icon={Icon.Trash}
          title={`Move ${chosen.length} Selected to Trash`}
          style={Action.Style.Destructive}
          shortcut={{ modifiers: ["cmd"], key: "return" }}
          onAction={() => performRemoval(chosen)}
        />
        {failedItems.length > 0 && (
          <Action
            icon={Icon.ArrowClockwise}
            title={`Retry ${failedItems.length} Failed Item${failedItems.length === 1 ? "" : "s"}`}
            shortcut={Keyboard.Shortcut.Common.ToggleQuickLook}
            onAction={() => performRemoval(failedItems, { confirm: false })}
          />
        )}
        <ActionPanel.Section>
          <Action
            icon={Icon.CheckCircle}
            title="Select All"
            shortcut={{ modifiers: ["cmd", "shift"], key: "a" }}
            onAction={() => setSelected(new Set(removable.map((entry) => entry.path)))}
          />
          <Action
            icon={Icon.Circle}
            title="Deselect All"
            shortcut={{ modifiers: ["cmd", "shift"], key: "d" }}
            onAction={() => setSelected(new Set())}
          />
        </ActionPanel.Section>
        <ActionPanel.Section>
          <Action.ShowInFinder path={item.path} />
          <Action.CopyToClipboard title="Copy Path" content={item.path} />
          {failedCommand && (
            <Action.CopyToClipboard
              icon={Icon.Terminal}
              title="Copy Command to Trash Failed Items"
              content={failedCommand}
            />
          )}
          {failedItems.length > 0 && (
            <Action.CopyToClipboard
              icon={Icon.Bug}
              title="Copy Failure Details"
              content={failedItems.map((entry) => `${entry.path}\n  ${failures.get(entry.path)?.reason}`).join("\n\n")}
            />
          )}
          {adminCommand && (
            <Action.CopyToClipboard
              icon={Icon.Terminal}
              title="Copy Command for Protected Items"
              content={adminCommand}
            />
          )}
        </ActionPanel.Section>
      </ActionPanel>
    );
  }

  function accessories(item: Leftover) {
    const failure = failures.get(item.path);
    return [
      { text: item.size > 0 ? formatBytes(item.size) : "—" },
      failure
        ? { tag: { value: failure.summary, color: Color.Red }, tooltip: failure.reason }
        : {
            tag: { value: item.reason, color: CONFIDENCE_COLOR[item.confidence] },
            tooltip: `${CONFIDENCE_LABEL[item.confidence]} — ${item.reason}`,
          },
    ];
  }

  return (
    <List
      isLoading={isLoading}
      navigationTitle={`Uninstall ${app.name}`}
      searchBarPlaceholder={`${chosen.length} selected · ${formatBytes(chosenSize)}`}
    >
      <List.EmptyView
        icon={Icon.Checkmark}
        title="Nothing found"
        description={`No files could be attributed to ${app.name}.`}
      />

      {failedItems.length > 0 && (
        <List.Section
          title="Could not be removed"
          subtitle={
            failedItems.some((item) => failures.get(item.path)?.settingsUrl)
              ? "Grant the permission below, then retry with ⌘Y"
              : `${failedItems.length} item${failedItems.length === 1 ? "" : "s"} · ⌘Y to retry`
          }
        >
          {failedItems.map((item) => (
            <List.Item
              key={item.path}
              icon={{ source: Icon.ExclamationMark, tintColor: Color.Red }}
              title={item.label}
              subtitle={tildify(item.path)}
              accessories={accessories(item)}
              actions={itemActions(item, false)}
            />
          ))}
        </List.Section>
      )}

      {SECTIONS.map(({ confidence, title, subtitle }) => {
        const items = pending.filter((item) => item.confidence === confidence);
        if (items.length === 0) return null;
        const picked = items.filter((item) => selected.has(item.path)).length;

        return (
          <List.Section key={confidence} title={title} subtitle={`${picked} of ${items.length} · ${subtitle}`}>
            {items.map((item) => (
              <List.Item
                key={item.path}
                icon={selected.has(item.path) ? { source: Icon.CheckCircle, tintColor: Color.Green } : Icon.Circle}
                title={item.label}
                subtitle={tildify(item.path)}
                accessories={accessories(item)}
                actions={itemActions(item, true)}
              />
            ))}
          </List.Section>
        );
      })}

      {adminOnly.length > 0 && (
        <List.Section title="Needs administrator rights" subtitle="Not removed by this extension">
          {adminOnly.map((item) => (
            <List.Item
              key={item.path}
              icon={
                selected.has(item.path)
                  ? { source: Icon.CheckCircle, tintColor: Color.Green }
                  : { source: Icon.Circle, tintColor: Color.SecondaryText }
              }
              title={item.label}
              subtitle={tildify(item.path)}
              accessories={accessories(item)}
              actions={itemActions(item, false)}
            />
          ))}
        </List.Section>
      )}

      {data && (
        <List.Section title="Notes">
          {data.bundleInUseBy.length > 0 && (
            <List.Item
              icon={{ source: Icon.ExclamationMark, tintColor: Color.Orange }}
              title={`${listNames(data.bundleInUseBy.map((holder) => holder.name))} ${data.bundleInUseBy.length === 1 ? "is" : "are"} running code from this bundle`}
              subtitle={`${data.bundleInUseBy.map((holder) => holder.component).join(", ")} — macOS refuses to move a bundle whose code is loaded`}
              accessories={[{ text: "Quit them first" }]}
              actions={
                <ActionPanel>
                  <Action
                    icon={Icon.XMarkCircle}
                    title={`Quit ${listNames(data.bundleInUseBy.map((holder) => holder.name))}`}
                    onAction={async () => {
                      for (const holder of data.bundleInUseBy) await quitAppNamed(holder.name);
                      await showToast({ style: Toast.Style.Success, title: "Asked them to quit" });
                    }}
                  />
                </ActionPanel>
              }
            />
          )}
          {data.isRunning && (
            <List.Item
              icon={{ source: Icon.Play, tintColor: Color.Blue }}
              title={`${app.name} is running`}
              subtitle="It will be asked to quit before anything is removed"
              actions={
                <ActionPanel>
                  <Action
                    icon={Icon.XMarkCircle}
                    title={`Quit ${app.name}`}
                    onAction={async () => {
                      const quit = await quitApp(app);
                      await showToast({
                        style: quit ? Toast.Style.Success : Toast.Style.Failure,
                        title: quit ? `Asked ${app.name} to quit` : `${app.name} did not quit`,
                      });
                    }}
                  />
                </ActionPanel>
              }
            />
          )}
          {data.vendorUninstaller && (
            <List.Item
              icon={{ source: Icon.Warning, tintColor: Color.Orange }}
              title="This app ships its own uninstaller"
              subtitle={tildify(data.vendorUninstaller)}
              accessories={[{ text: "Prefer it" }]}
              actions={
                <ActionPanel>
                  <Action.ShowInFinder path={data.vendorUninstaller} />
                  <Action.CopyToClipboard title="Copy Path" content={data.vendorUninstaller} />
                </ActionPanel>
              }
            />
          )}
          {data.caskToken && (
            <List.Item
              icon={{ source: Icon.Box, tintColor: Color.Orange }}
              title="Installed with Homebrew"
              subtitle={`brew uninstall --cask --zap ${data.caskToken}`}
              accessories={[{ text: "Knows its own cleanup" }]}
              actions={
                <ActionPanel>
                  <Action.CopyToClipboard
                    icon={Icon.Terminal}
                    title="Copy Brew Command"
                    content={`brew uninstall --cask --zap ${data.caskToken}`}
                  />
                </ActionPanel>
              }
            />
          )}
          {forgetCommand && (
            <List.Item
              icon={{ source: Icon.Receipt, tintColor: Color.SecondaryText }}
              title={`${data.packageReceipts.length} installer receipt${data.packageReceipts.length === 1 ? "" : "s"}`}
              subtitle={data.packageReceipts.join(", ")}
              accessories={[{ text: "Needs sudo" }]}
              actions={
                <ActionPanel>
                  <Action.CopyToClipboard icon={Icon.Terminal} title="Copy Forget Command" content={forgetCommand} />
                </ActionPanel>
              }
            />
          )}
        </List.Section>
      )}
    </List>
  );
}
