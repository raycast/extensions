import {
  Action,
  ActionPanel,
  Alert,
  Color,
  confirmAlert,
  Detail,
  getPreferenceValues,
  Icon,
  List,
  LocalStorage,
  showToast,
  Toast,
  trash,
  useNavigation,
  Keyboard,
} from "@raycast/api";
import { showFailureToast, useLocalStorage } from "@raycast/utils";
import { basename, dirname, relative } from "node:path";
import { useEffect, useMemo, useRef, useState } from "react";
import { Artifact, ScanOptions } from "./types";
import { ScanForm } from "./components/scan-form";
import { ArtifactDetails } from "./components/artifact-details";
import { CleanupReview } from "./components/cleanup-review";
import { cleanup, planCleanup } from "./services/cleanup";
import { parseScanSettings, SETTINGS_KEY } from "./services/scan-settings";
import { useScan } from "./hooks/use-scan";
import { summarizeSizes } from "./utils/infographics";
import {
  estimatedTotal,
  Filter,
  filters,
  formatActivity,
  formatSize,
  markdownText,
  Sort,
  sorts,
  visibleArtifacts,
} from "./utils/artifacts";

export default function Command() {
  const { value, isLoading } = useLocalStorage<unknown>(SETTINGS_KEY);
  const [savedOptions, setSavedOptions] = useState<ScanOptions>();
  const { options, error } = useMemo(() => {
    try {
      return { options: parseScanSettings(value) };
    } catch (error) {
      return { error };
    }
  }, [value]);
  useEffect(() => {
    if (error !== undefined) {
      void showFailureToast(error, {
        title: "Saved Settings Could Not Be Read",
        message: "Configure a new scan to continue.",
      });
    }
  }, [error]);
  async function save(value: ScanOptions) {
    // The hook's setter handles write errors internally. Keep the form open if saving fails.
    await LocalStorage.setItem(SETTINGS_KEY, JSON.stringify(value));
    setSavedOptions(value);
  }
  if (isLoading) return <List isLoading />;
  const scanOptions = savedOptions ?? options;
  if (!scanOptions)
    return (
      <ScanForm
        initial={{ root: "", profiles: "node", executable: "", config: "", exclusions: "", includeSensitive: false }}
        onSave={save}
      />
    );
  return <ArtifactList options={scanOptions} onSave={save} />;
}

function ArtifactList({ options, onSave }: { options: ScanOptions; onSave: (value: ScanOptions) => Promise<void> }) {
  const scan = useScan(options);
  const sizeSummary = useMemo(() => summarizeSizes(scan.artifacts), [scan.artifacts]);
  const { push, pop } = useNavigation();
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const [sort, setSort] = useState<Sort>(() => getPreferenceValues<Preferences>().sortOrder ?? "largest");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState(false);
  const operation = useRef(false);
  const visible = useMemo(
    () => visibleArtifacts(scan.artifacts, query, filter, sort),
    [scan.artifacts, query, filter, sort],
  );
  const selectedVisible = useMemo(() => planCleanup(visible, selected), [visible, selected]);
  const scanning = scan.status === "preparing" || scan.status === "scanning";
  useEffect(() => {
    setSelected(new Set());
  }, [options]);

  async function refresh() {
    if (operation.current) return;
    setSelected(new Set());
    await scan.refresh();
  }

  function review(items: Artifact[]) {
    if (!items.length || operation.current) return;
    const confirmedItems = [...items];
    push(
      <CleanupReview
        items={confirmedItems}
        onConfirm={async () => {
          if (operation.current) return;
          operation.current = true;
          setBusy(true);
          try {
            if (
              !(await confirmAlert({
                title: `Move ${confirmedItems.length} ${confirmedItems.length === 1 ? "Directory" : "Directories"} to Trash?`,
                message: `${confirmedItems.length === 1 ? `${confirmedItems[0].path}\n\n` : "Only the exact paths shown in the review will be moved.\n\n"}${estimatedTotal(confirmedItems)}. Trash does not immediately release disk space.`,
                primaryAction: { title: "Move to Trash", style: Alert.ActionStyle.Destructive },
              }))
            )
              return;
            const sensitive = confirmedItems.filter((item) => item.risk === "sensitive");
            if (
              sensitive.length &&
              !(await confirmAlert({
                title: "Sensitive Directories Selected",
                message: `npkill flagged ${sensitive.length} ${sensitive.length === 1 ? "directory" : "directories"} as potentially important to an application. Review the warnings shown above. Removing them may break the application or lose local state.`,
                primaryAction: { title: "Move to Trash", style: Alert.ActionStyle.Destructive },
              }))
            )
              return;
            // Freeze discovery before cleanup, and wait for the process and validation queue to finish.
            await scan.stop();
            const root = scan.root.current;
            if (!root) throw new Error("No validated scan root. Scan again.");
            const toast = await showToast({
              style: Toast.Style.Animated,
              title: "Moving Reviewed Directories to Trash…",
            });
            const results = await cleanup(root, confirmedItems, scan.current.current, trash);
            const removed = results.filter((item) => item.status !== "failed").map((item) => item.path);
            scan.remove(removed);
            setSelected((previous) => new Set([...previous].filter((path) => !removed.includes(path))));
            const succeeded = results.filter((item) => item.status === "success").length;
            const failed = results.filter((item) => item.status === "failed").length;
            toast.style = failed ? Toast.Style.Failure : Toast.Style.Success;
            toast.title = `${succeeded} Moved to Trash${failed ? ` · ${failed} Failed` : ""}`;
            toast.message = failed
              ? "See the cleanup report for each path."
              : "Disk space is released only after emptying Trash.";
            return results;
          } catch (error) {
            await showFailureToast(error, { title: "Cleanup Failed" });
          } finally {
            operation.current = false;
            setBusy(false);
          }
        }}
      />,
    );
  }

  const commonActions = (
    <>
      {selectedVisible.length > 0 && (
        <ActionPanel.Section title={`${selectedVisible.length} Visible Selected · ${estimatedTotal(selectedVisible)}`}>
          <Action
            title="Review Selected for Trash"
            icon={Icon.Trash}
            shortcut={{ modifiers: ["cmd", "shift"], key: "t" }}
            onAction={() => review(selectedVisible)}
          />
        </ActionPanel.Section>
      )}
      {selected.size > 0 && (
        <Action title="Clear Selection" icon={Icon.XMarkCircle} onAction={() => setSelected(new Set())} />
      )}
      <ActionPanel.Submenu title="Sort Results" icon={Icon.ArrowDown}>
        {Object.entries(sorts).map(([value, title]) => (
          <Action
            key={value}
            title={title}
            icon={sort === value ? Icon.Checkmark : undefined}
            onAction={() => setSort(value as Sort)}
          />
        ))}
      </ActionPanel.Submenu>
      <ActionPanel.Section>
        {scanning ? (
          <Action
            title="Stop Scan"
            icon={Icon.Stop}
            shortcut={{ modifiers: ["cmd", "opt"], key: "s" }}
            onAction={() => scan.stop()}
          />
        ) : (
          <Action
            title="Refresh Scan"
            icon={Icon.ArrowClockwise}
            shortcut={Keyboard.Shortcut.Common.Refresh}
            onAction={refresh}
          />
        )}
        <Action
          title="Configure Scan"
          icon={Icon.Gear}
          shortcut={{ modifiers: ["cmd", "shift"], key: "," }}
          onAction={async () => {
            if (operation.current) return;
            await scan.stop();
            push(
              <ScanForm
                navigationTitle="Configure Development Scan"
                initial={options}
                onSave={async (value) => {
                  await onSave(value);
                  pop();
                }}
              />,
            );
          }}
        />
        <Action.OpenInBrowser title="Open Npkill on GitHub" url="https://github.com/voidcosmos/npkill" />
      </ActionPanel.Section>
    </>
  );

  const statusText = {
    preparing: "Checking CLI",
    scanning: "Scanning",
    complete: "Complete",
    canceled: "Stopped",
    failed: "Scan failed",
  }[scan.status];
  const summary = `${statusText} · ${scan.artifacts.length} directories · ${estimatedTotal(scan.artifacts)}`;
  return (
    <List
      isLoading={scanning || busy}
      filtering={false}
      searchText={query}
      onSearchTextChange={setQuery}
      searchBarPlaceholder="Search project names or paths…"
      searchBarAccessory={
        <List.Dropdown tooltip="Filter Results" value={filter} onChange={(value) => setFilter(value as Filter)}>
          {Object.entries(filters).map(([value, title]) => (
            <List.Dropdown.Item key={value} value={value} title={title} />
          ))}
        </List.Dropdown>
      }
    >
      {(scan.error || scan.warnings.length > 0) && (
        <List.Section title="Scan Notices">
          <List.Item
            id="scan-notices"
            title={
              scan.error
                ? "Scan Could Not Complete"
                : `${scan.warnings.length}${scan.warnings.length === 100 ? "+" : ""} Scan Notices`
            }
            subtitle="Partial results are available below"
            icon={{ source: Icon.ExclamationMark, tintColor: Color.Orange }}
            actions={
              <ActionPanel>
                <Action.Push
                  title="View Scan Notices"
                  icon={Icon.Info}
                  target={
                    <Detail
                      markdown={`# Scan Notices\n\n${[scan.error, ...scan.warnings]
                        .filter(Boolean)
                        .map((message) => markdownText(message!))
                        .join(
                          "\n\n",
                        )}\n\nCheck your npkill installation, profiles, exclusions, and directory permissions. Configure Scan to change these settings.`}
                    />
                  }
                />
                {commonActions}
              </ActionPanel>
            }
          />
        </List.Section>
      )}
      <List.Section
        title={summary}
        subtitle={
          selected.size
            ? `${selectedVisible.length}/${selected.size} selected visible · ${estimatedTotal(selectedVisible)}`
            : `${options.profiles} · ${sorts[sort]}`
        }
      >
        {visible.map((artifact) => (
          <List.Item
            key={artifact.path}
            id={artifact.path}
            title={basename(artifact.path)}
            subtitle={{ value: relative(options.root, dirname(artifact.path)) || ".", tooltip: dirname(artifact.path) }}
            icon={selected.has(artifact.path) ? { source: Icon.CheckCircle, tintColor: Color.Green } : Icon.Folder}
            accessories={[
              { text: formatSize(artifact.size), tooltip: "Estimated size; actual reclaimed space can differ" },
              { text: formatActivity(artifact.activity), tooltip: "Last known project activity" },
              {
                tag: {
                  value:
                    artifact.risk === "review" ? "Review" : artifact.risk === "sensitive" ? "Sensitive" : "Unknown",
                  color: artifact.risk === "sensitive" ? Color.Orange : Color.SecondaryText,
                },
                tooltip: artifact.reason ?? "Inspect before cleanup; risk assessment is advisory",
              },
            ]}
            actions={
              <ActionPanel>
                <Action.Push
                  title="View Details"
                  icon={Icon.Info}
                  target={<ArtifactDetails artifact={artifact} summary={sizeSummary} scanStatus={scan.status} />}
                />
                <Action
                  title={selected.has(artifact.path) ? "Deselect Directory" : "Select Directory"}
                  icon={Icon.CheckCircle}
                  onAction={() =>
                    setSelected((previous) => {
                      const next = new Set(previous);
                      if (next.has(artifact.path)) next.delete(artifact.path);
                      else next.add(artifact.path);
                      return next;
                    })
                  }
                />
                <ActionPanel.Section title="Cleanup">
                  <Action
                    title="Review for Trash"
                    icon={Icon.Trash}
                    shortcut={{ modifiers: ["cmd"], key: "backspace" }}
                    onAction={() => review([artifact])}
                  />
                </ActionPanel.Section>
                <Action.ShowInFinder path={artifact.path} />
                <Action.Open title="Open Parent in Finder" target={dirname(artifact.path)} icon={Icon.Folder} />
                <Action.CopyToClipboard title="Copy Path" content={artifact.path} />
                {commonActions}
              </ActionPanel>
            }
          />
        ))}
      </List.Section>
      <List.EmptyView
        icon={scanning ? Icon.MagnifyingGlass : Icon.Folder}
        title={
          scanning
            ? "Discovering Development Artifacts…"
            : query || filter !== "all"
              ? "No Matching Artifacts"
              : "No Development Artifacts Found"
        }
        description={
          scanning
            ? "Results appear as npkill estimates their size and project activity."
            : "Change the search or filter, configure another directory, or refresh the scan."
        }
        actions={<ActionPanel>{commonActions}</ActionPanel>}
      />
    </List>
  );
}
