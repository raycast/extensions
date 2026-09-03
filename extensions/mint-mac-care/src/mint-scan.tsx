import {
  Action,
  ActionPanel,
  Alert,
  Color,
  Form,
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

type ScanOptions = {
  exactDuplicates: boolean;
  similarPhotos: boolean;
  agentArchives: boolean;
};

type DiskItem = {
  id: string;
  label: string;
  path: string;
  sizeBytes: number;
  sizeHuman?: string;
  category: string;
  bucket: string;
  defaultSelected: boolean;
  tier: "recommended" | "needs-review";
};

type DiskSection = {
  id: string;
  title: string;
  tier: "recommended" | "needs-review";
  totalBytes: number;
  items: DiskItem[];
};

type AgentCandidate = {
  id: string;
  title: string;
  path: string;
  sizeBytes: number;
  estimatedSaving: number;
  duplicateCount: number;
  defaultSelected: boolean;
  reversible: boolean;
};

type DiskScanResponse = {
  sessionID: string;
  notice?: string | null;
  scanMode: string;
  itemCount: number;
  totalBytes: number;
  totalHuman?: string;
  sections: DiskSection[];
  agentArchives?: {
    complete: boolean;
    estimatedSaving: number;
    candidates: AgentCandidate[];
  };
};

type DiskCleanResponse = {
  cleanedCount: number;
  failedCount: number;
  keptCount: number;
  processedBytes: number;
  movedToTrashBytes: number;
  permanentlyDeletedBytes: number;
  blockedCount: number;
};

type AgentOptimizeResponse = {
  optimizedCount: number;
  savedBytes: number;
  quotaBlockedCount: number;
  safetyBlockedCount: number;
};

export default function Command() {
  const { resolution, recheck } = useMintCLI();
  const { push } = useNavigation();

  if (resolution.status !== "ready") return <MissingMint resolution={resolution} onRetry={recheck} />;

  return (
    <Form
      navigationTitle="Free Disk with Mint"
      actions={
        <ActionPanel>
          <Action.SubmitForm<ScanOptions>
            title="Scan and Review"
            icon={Icon.MagnifyingGlass}
            onSubmit={(values) => push(<DiskReview cli={resolution.path} options={values} />)}
          />
        </ActionPanel>
      }
    >
      <Form.Description text="Basic cleanup always runs. Add deeper checks for this scan only; Mint will not change anything until you review the results." />
      <Form.Separator />
      <Form.Checkbox id="exactDuplicates" title="Exact Duplicates" label="Hash candidate files · takes longer" />
      <Form.Checkbox
        id="similarPhotos"
        title="Similar Photos"
        label="Compare photo thumbnails · may take much longer"
      />
      <Form.Checkbox
        id="agentArchives"
        title="AI Agents"
        label="Measure archived Codex sessions · reversible optimize"
      />
      <Form.Description text="Every cleanup uses the same Mint Boundaries, weekly allowance, cleanup method, history, and Undo as the Mint app." />
    </Form>
  );
}

function DiskReview({ cli, options }: { cli: string; options: ScanOptions }) {
  const { pop } = useNavigation();
  const [selectedIDs, setSelectedIDs] = useState<Set<string>>(new Set());
  const initializedSession = useRef<string>();
  const { data, error, isLoading } = usePromise(async () =>
    runMintSurface<DiskScanResponse>(
      cli,
      {
        action: "disk.scan",
        includeExactDuplicates: options.exactDuplicates,
        includeSimilarPhotos: options.similarPhotos,
        includeAgentArchives: options.agentArchives,
      },
      30 * 60_000,
    ),
  );

  const diskItems = data?.sections.flatMap((section) => section.items) ?? [];
  const agentItems = data?.agentArchives?.candidates ?? [];

  useEffect(() => {
    if (!data || initializedSession.current === data.sessionID) return;
    initializedSession.current = data.sessionID;
    setSelectedIDs(
      new Set([
        ...diskItems.filter((item) => item.defaultSelected).map((item) => item.id),
        ...agentItems.filter((item) => item.defaultSelected).map((item) => item.id),
      ]),
    );
  }, [data, diskItems, agentItems]);

  const toggle = (id: string) =>
    setSelectedIDs((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const selectedDisk = diskItems.filter((item) => selectedIDs.has(item.id));
  const selectedAgents = agentItems.filter((item) => selectedIDs.has(item.id));
  const allIDs = [...diskItems.map((item) => item.id), ...agentItems.map((item) => item.id)];

  async function cleanSelected() {
    if (!data || (selectedDisk.length === 0 && selectedAgents.length === 0)) return;
    const accepted = await confirmAlert({
      icon: Icon.Trash,
      title: "Run the selected Mint actions?",
      message: [
        selectedDisk.length
          ? `${selectedDisk.length} Disk item${selectedDisk.length === 1 ? "" : "s"} will use Mint's current cleanup method and weekly allowance.`
          : undefined,
        selectedAgents.length
          ? `${selectedAgents.length} archived Codex conversation${selectedAgents.length === 1 ? "" : "s"} will be optimized reversibly.`
          : undefined,
        "Protected paths remain untouched. Needs Review items are authorized for this run only.",
      ]
        .filter(Boolean)
        .join("\n\n"),
      primaryAction: { title: "Run in Mint", style: Alert.ActionStyle.Destructive },
    });
    if (!accepted) return;

    const toast = await showToast({ style: Toast.Style.Animated, title: "Mint is working…" });
    const summaries: string[] = [];
    try {
      // Disk cleanup consumes the shared review session, so reversible Agent
      // optimization runs first when both were selected.
      if (selectedAgents.length) {
        const result = await runMintSurface<AgentOptimizeResponse>(cli, {
          action: "agent.optimize",
          sessionID: data.sessionID,
          agentIDs: selectedAgents.map((item) => item.id),
          confirmed: true,
        });
        summaries.push(`${result.optimizedCount} AI archive${result.optimizedCount === 1 ? "" : "s"} optimized`);
        if (result.quotaBlockedCount) summaries.push(`${result.quotaBlockedCount} held by weekly allowance`);
      }
      if (selectedDisk.length) {
        const result = await runMintSurface<DiskCleanResponse>(cli, {
          action: "disk.clean",
          sessionID: data.sessionID,
          itemIDs: selectedDisk.map((item) => item.id),
          confirmed: true,
        });
        summaries.push(`${result.cleanedCount} Disk item${result.cleanedCount === 1 ? "" : "s"} processed`);
        if (result.blockedCount) summaries.push(`${result.blockedCount} held by weekly allowance`);
        if (result.failedCount) summaries.push(`${result.failedCount} could not be changed`);
      }
      toast.style = Toast.Style.Success;
      toast.title = "Mint finished";
      toast.message = summaries.join(" · ");
      pop();
    } catch (actionError) {
      toast.style = Toast.Style.Failure;
      toast.title = summaries.length ? "Mint completed part of the request" : "Mint could not complete the request";
      toast.message = actionError instanceof Error ? actionError.message : String(actionError);
    }
  }

  return (
    <List isLoading={isLoading} navigationTitle="Review Disk Cleanup" searchBarPlaceholder="Filter Mint findings">
      {error ? (
        <List.EmptyView title="Disk scan failed" description={error.message} icon={Icon.ExclamationMark} />
      ) : null}
      {!error && !isLoading && data && diskItems.length === 0 && agentItems.length === 0 ? (
        <List.EmptyView
          title="Nothing to clean"
          description={data.notice ?? "Mint did not find actionable items."}
          icon={Icon.CheckCircle}
        />
      ) : null}

      {data?.sections.map((section) => (
        <List.Section
          key={section.id}
          title={section.title}
          subtitle={`${section.items.length} · ${formatBytes(section.totalBytes)}`}
        >
          {section.items.map((item) => (
            <List.Item
              key={item.id}
              icon={{
                source: selectedIDs.has(item.id) ? Icon.CheckCircle : Icon.Circle,
                tintColor: selectedIDs.has(item.id) ? Color.Green : Color.SecondaryText,
              }}
              title={item.label}
              subtitle={shortPath(item.path)}
              accessories={[
                { text: item.sizeHuman ?? formatBytes(item.sizeBytes) },
                ...(section.tier === "needs-review" ? [{ tag: { value: "Needs Review", color: Color.Orange } }] : []),
              ]}
              actions={
                <ReviewActions
                  selected={selectedIDs.has(item.id)}
                  toggle={() => toggle(item.id)}
                  run={cleanSelected}
                  canRun={selectedIDs.size > 0}
                  selectAll={() => setSelectedIDs(new Set(allIDs))}
                  clearAll={() => setSelectedIDs(new Set())}
                  path={item.path}
                />
              }
            />
          ))}
        </List.Section>
      ))}

      {agentItems.length ? (
        <List.Section
          title="AI Agents · Reversible Optimize"
          subtitle={formatBytes(data?.agentArchives?.estimatedSaving ?? 0)}
        >
          {agentItems.map((item) => (
            <List.Item
              key={item.id}
              icon={{
                source: selectedIDs.has(item.id) ? Icon.CheckCircle : Icon.Circle,
                tintColor: selectedIDs.has(item.id) ? Color.Green : Color.SecondaryText,
              }}
              title={item.title}
              subtitle={shortPath(item.path)}
              accessories={[
                { text: `${formatBytes(item.estimatedSaving)} saving` },
                { tag: { value: "Undoable", color: Color.Blue } },
              ]}
              actions={
                <ReviewActions
                  selected={selectedIDs.has(item.id)}
                  toggle={() => toggle(item.id)}
                  run={cleanSelected}
                  canRun={selectedIDs.size > 0}
                  selectAll={() => setSelectedIDs(new Set(allIDs))}
                  clearAll={() => setSelectedIDs(new Set())}
                  path={item.path}
                />
              }
            />
          ))}
        </List.Section>
      ) : null}
    </List>
  );
}

function ReviewActions({
  selected,
  toggle,
  run,
  canRun,
  selectAll,
  clearAll,
  path,
}: {
  selected: boolean;
  toggle: () => void;
  run: () => Promise<void>;
  canRun: boolean;
  selectAll: () => void;
  clearAll: () => void;
  path: string;
}) {
  return (
    <ActionPanel>
      <Action
        title={selected ? "Keep This Item" : "Select This Item"}
        icon={selected ? Icon.XMarkCircle : Icon.CheckCircle}
        onAction={toggle}
      />
      <Action
        title="Clean and Optimize Selected"
        icon={Icon.Trash}
        style={Action.Style.Destructive}
        onAction={run}
        disabled={!canRun}
      />
      <ActionPanel.Section>
        <Action title="Select All" icon={Icon.Checkmark} onAction={selectAll} />
        <Action title="Deselect All" icon={Icon.Circle} onAction={clearAll} />
        <Action.ShowInFinder path={path} />
      </ActionPanel.Section>
    </ActionPanel>
  );
}
