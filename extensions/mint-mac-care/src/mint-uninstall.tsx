import {
  Action,
  ActionPanel,
  Alert,
  Color,
  Icon,
  List,
  Toast,
  confirmAlert,
  showToast,
  useNavigation,
} from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { useEffect, useRef, useState } from "react";
import { formatBytes, runMintSurface, shortPath } from "./mint-cli";
import { MissingMint } from "./missing-mint";
import { useMintCLI } from "./use-mint-cli";

type InstalledApp = {
  id: string;
  name: string;
  path: string;
  bundleIdentifier: string;
};

type AppsResponse = { items: InstalledApp[] };

type Remnant = {
  id: string;
  category: string;
  categoryTitle: string;
  label: string;
  path: string;
  sizeBytes: number;
  sizeHuman?: string;
  boundary: "ordinary" | "needs-review" | "protected";
  requiresAdmin: boolean;
  defaultSelected: boolean;
  selectable: boolean;
};

type UninstallScanResponse = {
  sessionID: string;
  appName: string;
  appPath: string;
  bundleIdentifier: string;
  itemCount: number;
  totalBytes: number;
  items: Remnant[];
};

type UninstallResponse = {
  deletedCount: number;
  failedCount: number;
  freedBytes: number;
  quotaBlockedCount: number;
  safetyBlockedCount: number;
  removedAppBundle: boolean;
  adminAuthorizationRequired?: boolean;
  adminAuthorizationWasCancelled?: boolean;
};

export default function Command() {
  const { resolution, recheck } = useMintCLI();
  if (resolution.status !== "ready") return <MissingMint resolution={resolution} onRetry={recheck} />;
  return <InstalledApps cli={resolution.path} />;
}

function InstalledApps({ cli }: { cli: string }) {
  const { push } = useNavigation();
  const { data, error, isLoading, revalidate } = usePromise(async () =>
    runMintSurface<AppsResponse>(cli, { action: "apps.list" }, 30_000),
  );

  return (
    <List isLoading={isLoading} navigationTitle="Uninstall with Mint" searchBarPlaceholder="Choose an installed app">
      {error ? (
        <List.EmptyView title="Could not list applications" description={error.message} icon={Icon.ExclamationMark} />
      ) : null}
      {!error && !isLoading && data?.items.length === 0 ? <List.EmptyView title="No applications found" /> : null}
      {data?.items.map((app) => (
        <List.Item
          key={app.id}
          icon={{ fileIcon: app.path }}
          title={app.name}
          subtitle={app.bundleIdentifier}
          accessories={[{ text: shortPath(app.path) }]}
          actions={
            <ActionPanel>
              <Action
                title="Scan App and Leftovers"
                icon={Icon.MagnifyingGlass}
                onAction={() => push(<UninstallReview cli={cli} app={app} />)}
              />
              <Action.ShowInFinder path={app.path} />
              <Action title="Refresh Applications" icon={Icon.ArrowClockwise} onAction={revalidate} />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}

function UninstallReview({ cli, app }: { cli: string; app: InstalledApp }) {
  const { pop } = useNavigation();
  const [selectedIDs, setSelectedIDs] = useState<Set<string>>(new Set());
  const initializedSession = useRef<string | undefined>(undefined);
  const { data, error, isLoading } = usePromise(async () =>
    runMintSurface<UninstallScanResponse>(cli, { action: "uninstall.scan", path: app.path }, 5 * 60_000),
  );

  useEffect(() => {
    if (!data || initializedSession.current === data.sessionID) return;
    initializedSession.current = data.sessionID;
    setSelectedIDs(new Set(data.items.filter((item) => item.defaultSelected).map((item) => item.id)));
  }, [data]);

  const selected = data?.items.filter((item) => selectedIDs.has(item.id) && item.selectable) ?? [];
  const includesApp = selected.some((item) => item.category === "app-bundle");
  const includesAdmin = selected.some((item) => item.requiresAdmin);
  const toggle = (item: Remnant) => {
    if (!item.selectable) return;
    setSelectedIDs((current) => {
      const next = new Set(current);
      if (next.has(item.id)) next.delete(item.id);
      else next.add(item.id);
      return next;
    });
  };

  async function removeSelected() {
    if (!data || selected.length === 0) return;
    const accepted = await confirmAlert({
      icon: { fileIcon: app.path },
      title: includesApp ? `Uninstall ${app.name}?` : `Remove selected ${app.name} data?`,
      message: [
        `${selected.length} selected item${selected.length === 1 ? "" : "s"} (${formatBytes(selected.reduce((sum, item) => sum + item.sizeBytes, 0))}) will be moved to Trash.`,
        "Mint will recheck Boundaries and the shared weekly cleanup allowance before acting.",
        includesAdmin ? "macOS may ask for an administrator password for protected app locations." : undefined,
      ]
        .filter(Boolean)
        .join("\n\n"),
      primaryAction: {
        title: includesApp ? "Move App and Data to Trash" : "Move Selected Data to Trash",
        style: Alert.ActionStyle.Destructive,
      },
    });
    if (!accepted) return;

    const toast = await showToast({
      style: Toast.Style.Animated,
      title: includesApp ? `Uninstalling ${app.name}…` : "Removing selected app data…",
    });
    try {
      const result = await runMintSurface<UninstallResponse>(cli, {
        action: "uninstall.execute",
        sessionID: data.sessionID,
        itemIDs: selected.map((item) => item.id),
        allowAdmin: true,
        confirmed: true,
      });
      toast.style = result.failedCount ? Toast.Style.Failure : Toast.Style.Success;
      toast.title = result.removedAppBundle
        ? `${app.name} moved to Trash`
        : `${result.deletedCount} item${result.deletedCount === 1 ? "" : "s"} moved to Trash`;
      toast.message = [
        result.freedBytes ? `${formatBytes(result.freedBytes)} processed` : undefined,
        result.quotaBlockedCount ? `${result.quotaBlockedCount} held by weekly allowance` : undefined,
        result.safetyBlockedCount ? `${result.safetyBlockedCount} protected by Boundaries` : undefined,
        result.failedCount ? `${result.failedCount} could not be moved` : undefined,
      ]
        .filter(Boolean)
        .join(" · ");
      pop();
    } catch (removeError) {
      toast.style = Toast.Style.Failure;
      toast.title = "Mint could not finish the uninstall";
      toast.message = removeError instanceof Error ? removeError.message : String(removeError);
    }
  }

  const grouped = new Map<string, Remnant[]>();
  for (const item of data?.items ?? []) {
    const group = grouped.get(item.categoryTitle) ?? [];
    group.push(item);
    grouped.set(item.categoryTitle, group);
  }

  return (
    <List isLoading={isLoading} navigationTitle={`Review ${app.name}`} searchBarPlaceholder="Filter app files">
      {error ? (
        <List.EmptyView title="App scan failed" description={error.message} icon={Icon.ExclamationMark} />
      ) : null}
      {!error && !isLoading && data?.items.length === 0 ? <List.EmptyView title="No app files found" /> : null}
      {[...grouped.entries()].map(([title, items]) => (
        <List.Section
          key={title}
          title={title}
          subtitle={formatBytes(items.reduce((sum, item) => sum + item.sizeBytes, 0))}
        >
          {items.map((item) => (
            <List.Item
              key={item.id}
              icon={{
                source:
                  item.boundary === "protected" ? Icon.Lock : selectedIDs.has(item.id) ? Icon.CheckCircle : Icon.Circle,
                tintColor:
                  item.boundary === "protected"
                    ? Color.Red
                    : selectedIDs.has(item.id)
                      ? Color.Green
                      : Color.SecondaryText,
              }}
              title={item.label}
              subtitle={shortPath(item.path)}
              accessories={[
                { text: item.sizeHuman ?? formatBytes(item.sizeBytes) },
                ...(item.boundary === "needs-review" ? [{ tag: { value: "Needs Review", color: Color.Orange } }] : []),
                ...(item.boundary === "protected" ? [{ tag: { value: "Protected", color: Color.Red } }] : []),
                ...(item.requiresAdmin ? [{ tag: { value: "Admin", color: Color.Yellow } }] : []),
              ]}
              actions={
                <ActionPanel>
                  {item.selectable ? (
                    <Action
                      title={selectedIDs.has(item.id) ? "Keep This Item" : "Select This Item"}
                      icon={selectedIDs.has(item.id) ? Icon.XMarkCircle : Icon.CheckCircle}
                      onAction={() => toggle(item)}
                    />
                  ) : null}
                  {selected.length > 0 ? (
                    <Action
                      title={includesApp ? `Uninstall ${app.name}` : "Remove Selected App Data"}
                      icon={Icon.Trash}
                      style={Action.Style.Destructive}
                      onAction={removeSelected}
                    />
                  ) : null}
                  <ActionPanel.Section>
                    <Action
                      title="Select Safe Leftovers"
                      icon={Icon.Checkmark}
                      onAction={() =>
                        setSelectedIDs(
                          new Set(
                            data?.items
                              .filter((candidate) => candidate.defaultSelected)
                              .map((candidate) => candidate.id) ?? [],
                          ),
                        )
                      }
                    />
                    <Action title="Deselect All" icon={Icon.Circle} onAction={() => setSelectedIDs(new Set())} />
                    <Action.ShowInFinder path={item.path} />
                  </ActionPanel.Section>
                </ActionPanel>
              }
            />
          ))}
        </List.Section>
      ))}
    </List>
  );
}
