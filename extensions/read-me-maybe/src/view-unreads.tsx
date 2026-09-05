import {
  Action,
  ActionPanel,
  Alert,
  Color,
  confirmAlert,
  closeMainWindow,
  Form,
  getApplications,
  Icon,
  Keyboard,
  List,
  showToast,
  Toast,
  useNavigation,
} from "@raycast/api";
import { clearInterval, setInterval } from "node:timers";
import { useEffect, useRef, useState } from "react";

import { scanDock } from "./dock-scan";
import { loadAccessCheckState } from "./setup-gate";
import {
  addSourceDraft,
  addSourceRow,
  defaultOpenCommand,
  editSourceDraft,
  moveSource,
  removeSource,
  sourceFormErrors,
  toggleSourceEnabled,
  updateSourceRow,
  type AddSourceValues,
  type InstalledApplication,
  type MoveDirection,
  type SourceFormErrors,
} from "./domain/configure-sources";
import type { UnreadSnapshot } from "./domain/unread-snapshot";
import { DockScanCoordinator } from "./domain/dock-scan-coordinator";
import {
  aggregateStatusLabel,
  enabledSources,
  openCommandForSource,
  relativeFreshness,
  sameEnabledSources,
  summarizeDockScan,
} from "./domain/unread-count";
import { messageIcon, sourceViewItems, type SourceViewItem, type ViewItemStatus } from "./domain/view-unreads";
import type { StoredSource } from "./domain/source-catalog";
import { runOpenCommand } from "./open-source";
import { loadSourceCatalog, saveSourceCatalog } from "./source-catalog-store";
import { loadUnreadSnapshot, saveUnreadSnapshot } from "./unread-snapshot-store";

const dockScans = new DockScanCoordinator((sources, timeout) => scanDock(sources, timeout));

export default function ViewUnreadsCommand() {
  const [sources, setSources] = useState<StoredSource[]>();
  const [snapshot, setSnapshot] = useState<UnreadSnapshot>();
  const [snapshotReady, setSnapshotReady] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const queuedEdits = useRef<Promise<unknown>>(Promise.resolve());

  useEffect(() => {
    let cancelled = false;

    async function load() {
      let rows: StoredSource[] = [];
      try {
        const [catalog, storedSnapshot] = await Promise.all([loadSourceCatalog(), loadUnreadSnapshot()]);
        rows = catalog.sources;
        if (cancelled) return;
        setSources(rows);
        setSnapshot(storedSnapshot);
      } catch {
        await showToast({ style: Toast.Style.Failure, title: "Could not load Sources" });
      }
      if (cancelled) return;
      setSnapshotReady(true);
      await refreshOnOpen(rows);
    }

    async function refreshOnOpen(rows: StoredSource[]) {
      try {
        const enabled = enabledSources(rows);
        if (enabled.length === 0 || !(await loadAccessCheckState()).setupGate) return;
        setRefreshing(true);
        // A scan's data is no newer than its start: the menu's cycle can write
        // a fresher snapshot and queued edits can reshape the Catalog while it
        // runs, so this scan only persists while it is still the most recent
        // reading of an unchanged Catalog.
        const scanStartedAt = new Date();
        const scan = await dockScans.background(enabled);
        await queuedEdits.current;
        const [catalog, stored] = await Promise.all([loadSourceCatalog(), loadUnreadSnapshot()]);
        if (!sameEnabledSources(enabled, catalog.sources)) return;
        if (stored && stored.readAt > scanStartedAt) {
          // A snapshot written mid-scan is the more recent reading; adopt it
          // instead of regressing the store with this stale scan.
          if (!cancelled) setSnapshot(stored);
          return;
        }
        const fresh: UnreadSnapshot = { result: summarizeDockScan(enabled, scan), readAt: new Date() };
        // A storage failure must not fail the refresh; the menu's next cycle
        // would rewrite the snapshot anyway.
        await saveUnreadSnapshot(fresh).catch(() => undefined);
        if (!cancelled) setSnapshot(fresh);
      } catch {
        // A failed refresh keeps the retained snapshot on display.
      } finally {
        if (!cancelled) setRefreshing(false);
      }
    }

    void load();
    // The menu's scan cycle runs every 15s; a 30s poll picks up each new
    // snapshot promptly and keeps the Active header's freshness honest.
    const poll = setInterval(() => {
      void loadUnreadSnapshot().then((storedSnapshot) => {
        if (!cancelled) setSnapshot(storedSnapshot);
      });
    }, 30_000);
    return () => {
      cancelled = true;
      clearInterval(poll);
    };
  }, []);

  async function persistEdit(transform: (rows: StoredSource[]) => StoredSource[]): Promise<boolean> {
    try {
      const catalog = await loadSourceCatalog();
      const result = await saveSourceCatalog(transform(catalog.sources));
      if (result.kind === "invalid") {
        await showToast({ style: Toast.Style.Failure, title: "Could not update Sources", message: result.reason });
        return false;
      }
      setSources(result.catalog.sources);
      return true;
    } catch {
      await showToast({ style: Toast.Style.Failure, title: "Could not update Sources" });
      return false;
    }
  }

  function queueEdit(transform: (rows: StoredSource[]) => StoredSource[]): Promise<boolean> {
    const run = queuedEdits.current.then(() => persistEdit(transform));
    queuedEdits.current = run.then(
      () => undefined,
      () => undefined,
    );
    return run;
  }

  async function toggleEnabled(item: SourceViewItem) {
    await queueEdit((rows) => toggleSourceEnabled(rows, item.id));
  }

  function moveRow(sourceId: string, direction: MoveDirection) {
    return queueEdit((rows) => moveSource(rows, sourceId, direction));
  }

  async function removeAfterConfirmation(item: SourceViewItem) {
    const confirmed = await confirmAlert({
      title: `Remove "${item.title}"?`,
      message: "The Source is removed from the Source Catalog and the Read Me Maybe menu stops reading its Dock Badge.",
      primaryAction: { title: "Remove", style: Alert.ActionStyle.Destructive },
    });
    if (!confirmed) return;
    await queueEdit((rows) => removeSource(rows, item.id));
  }

  async function openSource(source: StoredSource) {
    const command = openCommandForSource(source);
    if (command === "") {
      await showToast({
        style: Toast.Style.Failure,
        title: "No Open Command configured",
        message: "Add an Application or an Open Command to this Source",
      });
      return;
    }
    runOpenCommand(command);
    // Return-to-open means "I'm going to the app now": the menu-bar dismisses
    // when a row runs its command, so the view closes its window likewise.
    await closeMainWindow();
  }

  if (sources === undefined || !snapshotReady) {
    return <List isLoading />;
  }

  const items = sourceViewItems(sources, snapshot?.result.sources ?? []);
  const statusLabel = snapshot ? aggregateStatusLabel(snapshot.result.aggregate) : undefined;
  const activeItems = items.filter((item) => item.enabled);
  const disabledItems = items.filter((item) => !item.enabled);
  const activeSectionTitle = snapshot ? `Active: updated ${relativeFreshness(snapshot.readAt, new Date())}` : "Active";
  const addSourceTarget = <SourceForm catalogRows={sources} onSave={queueEdit} />;

  const sourceRow = (item: SourceViewItem) => {
    const source = sources.find((row) => row.id === item.id) as StoredSource;
    return (
      <List.Item
        key={item.id}
        title={item.title}
        subtitle={item.subtitle}
        icon={item.icon}
        accessories={[
          {
            tag: { value: item.status.label, color: statusColor(item.status) },
            tooltip: statusTooltip(item.status),
          },
        ]}
        actions={
          <ActionPanel>
            {/* The first action is the default: Enter opens the Source. */}
            <Action title="Open Source" icon={Icon.ArrowRight} onAction={() => void openSource(source)} />
            <Action.Push
              title="Edit Source"
              icon={Icon.Pencil}
              shortcut={Keyboard.Shortcut.Common.Edit}
              target={<SourceForm catalogRows={sources} source={source} onSave={queueEdit} />}
            />
            <Action
              title="Toggle Enabled"
              icon={source.enabled ? Icon.EyeDisabled : Icon.Eye}
              // Tab toggles without opening the action panel — enable/disable
              // is the one management edit users repeat per row.
              shortcut={{ modifiers: [], key: "tab" }}
              onAction={() => void toggleEnabled(item)}
            />
            <Action
              title="Remove Source"
              icon={Icon.Trash}
              style={Action.Style.Destructive}
              shortcut={{ modifiers: ["ctrl"], key: "x" }}
              onAction={() => void removeAfterConfirmation(item)}
            />
            <ActionPanel.Section title="Order">
              {/* opt+shift+arrows move the row within its Active/Disabled
                  section without leaving the list for a reorder mode. */}
              <Action
                title="Move up"
                icon={Icon.ArrowUp}
                shortcut={{ modifiers: ["opt", "shift"], key: "arrowUp" }}
                onAction={() => void moveRow(item.id, "up")}
              />
              <Action
                title="Move Down"
                icon={Icon.ArrowDown}
                shortcut={{ modifiers: ["opt", "shift"], key: "arrowDown" }}
                onAction={() => void moveRow(item.id, "down")}
              />
            </ActionPanel.Section>
            <ActionPanel.Section title="Catalog">
              <Action.Push
                title="Add Source"
                icon={Icon.Plus}
                shortcut={Keyboard.Shortcut.Common.New}
                target={addSourceTarget}
              />
            </ActionPanel.Section>
          </ActionPanel>
        }
      />
    );
  };

  return (
    <List isLoading={refreshing} searchBarPlaceholder="Filter Sources" filtering={true}>
      {activeItems.length > 0 && (
        <List.Section key="active" title={activeSectionTitle} subtitle={statusLabel}>
          {activeItems.map((item) => sourceRow(item))}
        </List.Section>
      )}
      {disabledItems.length > 0 && (
        <List.Section key="disabled" title="Disabled">
          {disabledItems.map((item) => sourceRow(item))}
        </List.Section>
      )}
      {sources.length === 0 && (
        <>
          <List.EmptyView title="No Sources" description="The Source Catalog is empty" icon={messageIcon} />
          <List.Item
            title="Add Source"
            subtitle="Track another messaging app"
            icon={Icon.Plus}
            actions={
              <ActionPanel>
                <Action.Push
                  title="Add Source"
                  icon={Icon.Plus}
                  shortcut={Keyboard.Shortcut.Common.New}
                  target={addSourceTarget}
                />
              </ActionPanel>
            }
          />
        </>
      )}
    </List>
  );
}

function statusColor(status: ViewItemStatus): Color | undefined {
  switch (status.kind) {
    case "zero":
    case "disabled":
    case "notScanned":
      return Color.SecondaryText;
    case "unavailable":
      return Color.Red;
    default:
      return undefined;
  }
}

function statusTooltip(status: ViewItemStatus): string {
  switch (status.kind) {
    case "badge":
    case "zero":
      return "Dock Badge";
    case "attention":
      return "Attention Badge";
    case "unavailable":
      return "Unavailable Source";
    case "disabled":
      return "Excluded from the Unread Count";
    case "notScanned":
      return "No scan has read this Source yet";
  }
}

function SourceForm(props: {
  catalogRows: StoredSource[];
  source?: StoredSource;
  onSave: (transform: (rows: StoredSource[]) => StoredSource[]) => Promise<boolean>;
}) {
  const { catalogRows, source, onSave } = props;
  const { pop } = useNavigation();

  const [applications, setApplications] = useState<InstalledApplication[]>();
  const [appPath, setAppPath] = useState<string>();
  const [openCommand, setOpenCommand] = useState(source?.openCommand ?? "");
  const [errors, setErrors] = useState<SourceFormErrors>({});

  useEffect(() => {
    if (source) return;
    let active = true;
    getApplications()
      .then((installed) => {
        if (!active) return;
        const list = installed.map((application) => ({ name: application.name, path: application.path }));
        setApplications(list);
        setAppPath((current) => current ?? list[0]?.path);
      })
      .catch(async () => {
        if (active) setApplications([]);
        await showToast({ style: Toast.Style.Failure, title: "Could not load Applications" });
      });
    return () => {
      active = false;
    };
  }, [source]);

  async function submit() {
    if (source) {
      const draft = editSourceDraft(source, { openCommand });
      const currentErrors = sourceFormErrors(draft, catalogRows);
      if (currentErrors.appPath) {
        setErrors(currentErrors);
        return;
      }

      const saved = await onSave((rows) => updateSourceRow(rows, draft));
      if (saved) pop();
      return;
    }

    if (!appPath) {
      // The picker is empty — the installed list failed to load — so there is
      // no Application to derive Name and Dock Item Name from.
      setErrors({ appPath: "Application is required" });
      return;
    }
    const values: AddSourceValues = { appPath, openCommand };
    const currentErrors = sourceFormErrors(addSourceDraft(values), catalogRows);
    if (currentErrors.appPath) {
      setErrors(currentErrors);
      return;
    }

    const saved = await onSave((rows) => addSourceRow(rows, values));
    if (saved) pop();
  }

  const placeholderAppPath = source?.appPath ?? appPath;

  return (
    <Form
      navigationTitle={source ? "Edit Source" : "Add Source"}
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title={source ? "Save Source" : "Add Source"}
            icon={Icon.Plus}
            onSubmit={() => void submit()}
          />
        </ActionPanel>
      }
    >
      {!source && (
        <Form.Dropdown
          key={applications === undefined ? "unread" : "read"}
          id="application"
          title="Application"
          info="Installed messaging application this Source reads from"
          isLoading={applications === undefined}
          value={appPath}
          onChange={(value) => {
            setAppPath(value);
            setErrors((current) => ({ ...current, appPath: undefined }));
          }}
          error={errors.appPath}
        >
          {applications?.map((application) => (
            <Form.Dropdown.Item key={application.path} value={application.path} title={application.name} />
          ))}
        </Form.Dropdown>
      )}
      <Form.TextField
        id="openCommand"
        title="Open Command (optional)"
        info="Runs when the Source row is selected; defaults to opening the application"
        placeholder={placeholderAppPath ? defaultOpenCommand(placeholderAppPath) : undefined}
        value={openCommand}
        onChange={setOpenCommand}
      />
    </Form>
  );
}
