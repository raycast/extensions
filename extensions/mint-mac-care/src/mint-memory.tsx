import { Action, ActionPanel, Alert, Color, Icon, List, Toast, confirmAlert, showToast } from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { useEffect, useRef, useState } from "react";
import { formatBytes, runMintSurface } from "./mint-cli";
import { MissingMint } from "./missing-mint";
import { useMintCLI } from "./use-mint-cli";

type MemoryItem = {
  id: string;
  name: string;
  bytes: number;
  sizeHuman?: string;
  processCount: number;
  bundleIdentifier?: string | null;
  bundlePath?: string | null;
  agentKind?: string | null;
  action: "quit" | "force-quit" | "terminate" | "locked";
  selectable: boolean;
  advanced: boolean;
  needsReview: boolean;
  defaultSelected: boolean;
};

type MemoryScanResponse = {
  sessionID: string;
  sampledAt: string;
  detailsUnavailable: boolean;
  totalBytes?: number | null;
  usedBytes?: number | null;
  items: MemoryItem[];
};

type MemoryReleaseResponse = {
  requestedNames: string[];
  quitNames: string[];
  survivedNames: string[];
  freedBytes: number;
  handlingReviewBlockedNames: string[];
};

export default function Command() {
  const { resolution, recheck } = useMintCLI();
  if (resolution.status !== "ready") return <MissingMint resolution={resolution} onRetry={recheck} />;
  return <MemoryReview cli={resolution.path} />;
}

function MemoryReview({ cli }: { cli: string }) {
  const [selectedIDs, setSelectedIDs] = useState<Set<string>>(new Set());
  const initializedSession = useRef<string | undefined>(undefined);
  const { data, error, isLoading, revalidate } = usePromise(async () =>
    runMintSurface<MemoryScanResponse>(cli, { action: "memory.scan" }, 60_000),
  );

  useEffect(() => {
    if (!data || initializedSession.current === data.sessionID) return;
    initializedSession.current = data.sessionID;
    setSelectedIDs(new Set(data.items.filter((item) => item.defaultSelected).map((item) => item.id)));
  }, [data]);

  const selected = data?.items.filter((item) => selectedIDs.has(item.id) && item.selectable) ?? [];
  const toggle = (item: MemoryItem) => {
    if (!item.selectable) return;
    setSelectedIDs((current) => {
      const next = new Set(current);
      if (next.has(item.id)) next.delete(item.id);
      else next.add(item.id);
      return next;
    });
  };

  async function releaseSelected() {
    if (!data || selected.length === 0) return;
    const hasAdvanced = selected.some((item) => item.advanced);
    const accepted = await confirmAlert({
      icon: Icon.MemoryChip,
      title: `Release memory from ${selected.length} group${selected.length === 1 ? "" : "s"}?`,
      message: hasAdvanced
        ? "Mint will first ask apps to quit normally. Advanced selections can be force-quit or sent SIGTERM if they remain running; unsaved work may be lost. Boundaries are rechecked immediately before acting."
        : "Mint will ask the selected background apps to quit normally. Apps may show a save prompt; Mint will not force-quit standard selections.",
      primaryAction: {
        title: hasAdvanced ? "Release with Advanced Actions" : "Release Memory",
        style: hasAdvanced ? Alert.ActionStyle.Destructive : Alert.ActionStyle.Default,
      },
    });
    if (!accepted) return;

    const toast = await showToast({ style: Toast.Style.Animated, title: "Mint is releasing memory…" });
    try {
      const result = await runMintSurface<MemoryReleaseResponse>(cli, {
        action: "memory.release",
        sessionID: data.sessionID,
        itemIDs: selected.map((item) => item.id),
        allowAdvanced: hasAdvanced,
        confirmed: true,
      });
      toast.style = result.survivedNames.length ? Toast.Style.Failure : Toast.Style.Success;
      toast.title = result.quitNames.length
        ? `${result.quitNames.length} group${result.quitNames.length === 1 ? "" : "s"} quit`
        : "No process was changed";
      toast.message = [
        result.freedBytes > 0 ? `${formatBytes(result.freedBytes)} returned` : undefined,
        result.survivedNames.length ? `${result.survivedNames.length} still running` : undefined,
        result.handlingReviewBlockedNames.length
          ? `${result.handlingReviewBlockedNames.length} blocked by Boundaries`
          : undefined,
      ]
        .filter(Boolean)
        .join(" · ");
      initializedSession.current = undefined;
      setSelectedIDs(new Set());
      await revalidate();
    } catch (releaseError) {
      toast.style = Toast.Style.Failure;
      toast.title = "Mint could not release memory";
      toast.message = releaseError instanceof Error ? releaseError.message : String(releaseError);
    }
  }

  const standard = data?.items.filter((item) => !item.needsReview && item.selectable) ?? [];
  const confirmation = data?.items.filter((item) => item.needsReview && item.selectable) ?? [];
  const contextOnly = data?.items.filter((item) => !item.selectable) ?? [];

  return (
    <List isLoading={isLoading} navigationTitle="Free Memory" searchBarPlaceholder="Filter running apps and processes">
      {error ? (
        <List.EmptyView title="Memory scan failed" description={error.message} icon={Icon.ExclamationMark} />
      ) : null}
      {!error && !isLoading && data?.detailsUnavailable ? (
        <List.EmptyView
          title="Process details unavailable"
          description="This Mint edition can show host memory but cannot quit other apps."
          icon={Icon.Lock}
        />
      ) : null}
      {!error && !isLoading && data && !data.detailsUnavailable && data.items.length === 0 ? (
        <List.EmptyView title="No releasable processes" icon={Icon.CheckCircle} />
      ) : null}

      <MemorySection
        title="Safer to Quit"
        items={standard}
        selectedIDs={selectedIDs}
        toggle={toggle}
        run={releaseSelected}
        canRun={selected.length > 0}
        selectAll={() =>
          setSelectedIDs(new Set(data?.items.filter((item) => item.selectable).map((item) => item.id) ?? []))
        }
        clearAll={() => setSelectedIDs(new Set())}
      />
      <MemorySection
        title="Confirmation Required"
        items={confirmation}
        selectedIDs={selectedIDs}
        toggle={toggle}
        run={releaseSelected}
        canRun={selected.length > 0}
        selectAll={() =>
          setSelectedIDs(new Set(data?.items.filter((item) => item.selectable).map((item) => item.id) ?? []))
        }
        clearAll={() => setSelectedIDs(new Set())}
      />
      <MemorySection
        title="Running · Context Only"
        items={contextOnly}
        selectedIDs={selectedIDs}
        toggle={toggle}
        run={releaseSelected}
        canRun={selected.length > 0}
        selectAll={() => undefined}
        clearAll={() => setSelectedIDs(new Set())}
      />
    </List>
  );
}

function MemorySection({
  title,
  items,
  selectedIDs,
  toggle,
  run,
  canRun,
  selectAll,
  clearAll,
}: {
  title: string;
  items: MemoryItem[];
  selectedIDs: Set<string>;
  toggle: (item: MemoryItem) => void;
  run: () => Promise<void>;
  canRun: boolean;
  selectAll: () => void;
  clearAll: () => void;
}) {
  if (!items.length) return null;
  return (
    <List.Section title={title} subtitle={`${items.length} process group${items.length === 1 ? "" : "s"}`}>
      {items.map((item) => (
        <List.Item
          key={item.id}
          icon={
            item.bundlePath
              ? { fileIcon: item.bundlePath }
              : {
                  source: selectedIDs.has(item.id) ? Icon.CheckCircle : item.selectable ? Icon.Circle : Icon.Lock,
                  tintColor: selectedIDs.has(item.id) ? Color.Green : Color.SecondaryText,
                }
          }
          title={item.name}
          subtitle={
            item.agentKind ??
            item.bundleIdentifier ??
            `${item.processCount} process${item.processCount === 1 ? "" : "es"}`
          }
          accessories={[
            ...(item.selectable
              ? [
                  {
                    tag: {
                      value: selectedIDs.has(item.id) ? "Selected" : "Keep Running",
                      color: selectedIDs.has(item.id) ? Color.Green : Color.SecondaryText,
                    },
                  },
                ]
              : []),
            { text: item.sizeHuman ?? formatBytes(item.bytes) },
            ...(item.advanced ? [{ tag: { value: "Advanced", color: Color.Orange } }] : []),
            ...(item.needsReview ? [{ tag: { value: "Needs Review", color: Color.Yellow } }] : []),
          ]}
          actions={
            <ActionPanel>
              {item.selectable ? (
                <Action
                  title={selectedIDs.has(item.id) ? "Keep Running" : "Select for Release"}
                  icon={selectedIDs.has(item.id) ? Icon.XMarkCircle : Icon.CheckCircle}
                  onAction={() => toggle(item)}
                />
              ) : null}
              {canRun ? <Action title="Release Selected" icon={Icon.MemoryChip} onAction={run} /> : null}
              <ActionPanel.Section>
                <Action title="Select All Releasable" icon={Icon.Checkmark} onAction={selectAll} />
                <Action title="Deselect All" icon={Icon.Circle} onAction={clearAll} />
                {item.bundlePath ? <Action.ShowInFinder path={item.bundlePath} /> : null}
              </ActionPanel.Section>
            </ActionPanel>
          }
        />
      ))}
    </List.Section>
  );
}
