import {
  Action,
  ActionPanel,
  Alert,
  Color,
  Icon,
  Keyboard,
  LaunchType,
  List,
  Toast,
  confirmAlert,
  environment,
  launchCommand,
  showToast,
  useNavigation,
} from "@raycast/api";
import { getProgressIcon, usePromise } from "@raycast/utils";
import { useMemo, useRef, useState } from "react";
import { MintCLIVersion, formatCompact, openMint, plural, runMintSurface } from "./mint-cli";
import {
  Bucket,
  BucketKey,
  DiskScan,
  Entry,
  OptimizeScan,
  baseName,
  bucketPicture,
  bucketsOf,
  isDone,
} from "./mint-panes";
import { MissingMint } from "./missing-mint";
import { progressMarkdown, updatingDots } from "./progress-row";
import { useMintCLI } from "./use-mint-cli";
import { newProgressToken, useMintProgress } from "./use-progress";
import { useStrike } from "./use-strike";
import { rememberDuration } from "./use-wait";

type DiskClean = {
  cleanedCount: number;
  failedCount: number;
  physicallyReclaimedBytes?: number;
  movedToTrashBytes: number;
  permanentlyDeletedBytes: number;
  blockedCount: number;
  failures?: Array<{ path: string; reason: string }>;
  /** Mint 1.0.81: the scan's other rows, reviewable again without a second scan. */
  nextSessionID?: string | null;
};
type OptimizeResult = {
  reclaimedBytes: number;
  cancelled: boolean;
  failures?: Array<{ name: string; reason: string }>;
};
type Receipt = { bytes: number; text: string };
type Run = { key: BucketKey; verb: string; ids: string[] };

const SCAN_KEY = "disk.scan";
const OPTIMIZE_KEY = "optimize.scan";

export default function Command() {
  const { resolution, recheck } = useMintCLI();
  if (resolution.status !== "ready") return <MissingMint resolution={resolution} onRetry={recheck} />;
  return <FreeDisk cli={resolution.path} version={resolution.version} />;
}

/**
 * The Disk page in Raycast: its groups on the left from the first second,
 * each filling as Mint answers; what is in the selected one on the right.
 * ↵ acts on the whole group, and its rows are struck and fold away one by
 * one as they go. Yours is the person's own, so it is chosen, never removed
 * all at once.
 */
function FreeDisk({ cli, version }: { cli: string; version: MintCLIVersion }) {
  const grouped = version.capabilities?.includes("surface.groups.v1") ?? false;
  const tokens = useRef({ disk: newProgressToken(), copies: newProgressToken() });
  const [diskSession, setDiskSession] = useState<string | undefined>();
  const [run, setRun] = useState<Run | undefined>();
  const [receipts, setReceipts] = useState<Partial<Record<BucketKey, Receipt>>>({});
  // Mint's answers are single-use: the copies one is spent by an Optimize.
  const [copiesSpent, setCopiesSpent] = useState<string | undefined>();
  const strike = useStrike();

  const scan = usePromise(
    async (path: string, token: string) => {
      const started = Date.now();
      const result = await runMintSurface<DiskScan>(path, { action: "disk.scan", progressToken: token }, 30 * 60_000);
      rememberDuration(SCAN_KEY, (Date.now() - started) / 1000);
      return result;
    },
    [cli, tokens.current.disk],
    { onData: (result) => setDiskSession(result.sessionID) },
  );
  const copies = usePromise(
    async (path: string, token: string) => {
      const started = Date.now();
      const result = await runMintSurface<OptimizeScan>(
        path,
        { action: "disk.optimize.scan", progressToken: token },
        30 * 60_000,
      );
      rememberDuration(OPTIMIZE_KEY, (Date.now() - started) / 1000);
      return result;
    },
    [cli, tokens.current.copies],
  );
  const diskProgress = useMintProgress(tokens.current.disk, scan.isLoading, SCAN_KEY);
  const copiesProgress = useMintProgress(tokens.current.copies, copies.isLoading, OPTIMIZE_KEY);
  const buckets = useMemo(() => bucketsOf(scan.data, copies.data, grouped), [scan.data, copies.data, grouped]);

  const rescan = () => {
    tokens.current = { disk: newProgressToken(), copies: newProgressToken() };
    strike.reset();
    setReceipts({});
    setDiskSession(undefined);
    setCopiesSpent(undefined);
    scan.revalidate();
    copies.revalidate();
  };

  /**
   * One run on one group: its rows are struck as Mint finishes each (Mint
   * 1.0.81 says which) or, on an older Mint, when it answers; the receipt
   * takes the group's place once the last row has folded away.
   */
  async function act(
    bucket: Bucket,
    entries: Entry[],
    verb: string,
    request: (token: string) => Promise<{ done: string[]; receipt: Receipt; problem?: string }>,
  ) {
    if (run || strike.active) return;
    const ids = entries.flatMap((entry) => entry.ids);
    const token = newProgressToken();
    setRun({ key: bucket.key, verb, ids });
    strike.begin(ids.length, token);
    try {
      const { done, receipt, problem } = await request(token);
      strike.end(done, () => {
        setRun(undefined);
        setReceipts((current) => ({ ...current, [bucket.key]: receipt }));
      });
      if (problem) await showToast({ style: Toast.Style.Failure, title: problem });
    } catch (error) {
      strike.end([], () => setRun(undefined));
      await showToast({
        style: Toast.Style.Failure,
        title: "Mint could not finish",
        message: error instanceof Error ? error.message : String(error),
      });
    }
  }

  const optimizeAll = (bucket: Bucket) =>
    act(bucket, bucket.entries, "Optimizing", async (progressToken) => {
      setCopiesSpent(copies.data?.sessionID);
      const result = await runMintSurface<OptimizeResult>(
        cli,
        {
          action: "disk.optimize",
          sessionID: copies.data!.sessionID,
          itemIDs: bucket.entries.flatMap((entry) => entry.ids),
          confirmed: true,
          progressToken,
        },
        30 * 60_000,
      );
      const failures = result.failures ?? [];
      const refused = new Set(failures.map((failure) => failure.name));
      const done = result.cancelled
        ? []
        : (copies.data?.items ?? [])
            .filter((copy) => !refused.has(copy.path) && !refused.has(baseName(copy.path)))
            .map((copy) => copy.id);
      return {
        done,
        receipt: { bytes: result.reclaimedBytes, text: "back · nothing deleted" },
        problem: failures.length
          ? `${plural(failures.length, "file")} left as they were: ${failures[0].reason}`
          : undefined,
      };
    });

  const clean = async (bucket: Bucket, entries: Entry[], permanent: boolean) => {
    if (!diskSession) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Scan again first",
        message: "Mint's last answer was used.",
      });
      return;
    }
    const bytes = entries.reduce((sum, entry) => sum + entry.bytes, 0);
    if (permanent) {
      const accepted = await confirmAlert({
        icon: Icon.Trash,
        title: `Delete ${formatCompact(bytes)} permanently?`,
        message: `${plural(entries.length, "item")}, not moved to the Trash. Mint checks each one again before it acts.`,
        primaryAction: { title: "Delete Permanently", style: Alert.ActionStyle.Destructive },
      });
      if (!accepted) return;
    }
    await act(bucket, entries, permanent ? "Deleting" : "Moving to the Trash", async (progressToken) => {
      const result = await runMintSurface<DiskClean>(
        cli,
        {
          action: "disk.clean",
          sessionID: diskSession,
          itemIDs: entries.map((entry) => entry.id),
          confirmed: true,
          permanent,
          progressToken,
        },
        30 * 60_000,
      );
      setDiskSession(result.nextSessionID ?? undefined);
      const failed = new Set((result.failures ?? []).map((failure) => failure.path));
      // Rows Mint held back for the free allowance are not named: only the
      // ones it named as finished are struck then.
      const done = result.blockedCount
        ? []
        : entries.filter((entry) => !failed.has(entry.path)).map((entry) => entry.id);
      const problems = [
        result.blockedCount ? `${plural(result.blockedCount, "item")} held back: the free 1 GB is used up` : undefined,
        result.failedCount
          ? `${result.failedCount} kept: ${result.failures?.[0]?.reason ?? "macOS refused"}`
          : undefined,
      ].filter(Boolean);
      return {
        done,
        receipt: permanent
          ? { bytes: result.physicallyReclaimedBytes ?? result.permanentlyDeletedBytes, text: "freed" }
          : { bytes: result.movedToTrashBytes, text: "moved to the Trash" },
        problem: problems.length ? problems.join(" · ") : undefined,
      };
    });
  };

  const appearance = environment.appearance === "light" ? "light" : "dark";
  const total = buckets.reduce((sum, bucket) => sum + bucket.bytes, 0);
  const anyLoading = scan.isLoading || copies.isLoading;

  return (
    <List
      isLoading={anyLoading || Boolean(run)}
      isShowingDetail
      navigationTitle="Free Disk"
      searchBarPlaceholder={scan.data && copies.data ? `${formatCompact(total)} can be freed` : "Scanning your Mac…"}
    >
      <List.Section title="What can go">
        {buckets.map((bucket) => {
          const optimizable = bucket.key === "optimizable";
          const loading = optimizable ? copies.isLoading : scan.isLoading;
          const error = optimizable ? copies.error : scan.error;
          const progress = optimizable ? copiesProgress : diskProgress;
          const receipt = receipts[bucket.key];
          const left = bucket.entries.filter((entry) => !isDone(entry.ids, strike.struck));
          const remaining = left.reduce((sum, entry) => sum + entry.bytes, 0);
          const here = run?.key === bucket.key ? run : undefined;
          const running = here
            ? `${here.verb} · ${here.ids.filter((id) => strike.struck.has(id)).length} of ${here.ids.length}`
            : undefined;
          const accessories: List.Item.Accessory[] = loading
            ? [{ text: updatingDots() }]
            : error
              ? [{ icon: { source: Icon.Warning, tintColor: Color.Orange }, tooltip: error.message }]
              : receipt && left.length === 0
                ? [
                    { icon: { source: Icon.CheckCircle, tintColor: bucket.color } },
                    { text: `−${formatCompact(receipt.bytes)}` },
                  ]
                : [{ text: bucket.entries.length ? formatCompact(remaining) : "None" }];
          const markdown = loading
            ? progressMarkdown(optimizable ? "Looking for identical copies" : "Scanning your Mac", progress)
            : error
              ? `Mint could not look here.\n\n${error.message}`
              : bucketPicture(bucket, buckets, appearance, {
                  struck: strike.struck,
                  gone: strike.gone,
                  running,
                  receipt,
                });
          const busy = Boolean(run) || strike.active;
          return (
            <List.Item
              key={bucket.key}
              id={bucket.key}
              icon={
                loading
                  ? getProgressIcon(progress?.fraction ?? 0, bucket.color)
                  : { source: Icon.CircleFilled, tintColor: bucket.color }
              }
              title={bucket.title}
              accessories={accessories}
              detail={<List.Item.Detail markdown={markdown} />}
              actions={
                <ActionPanel>
                  {!loading && !busy && left.length ? (
                    optimizable ? (
                      copiesSpent === copies.data?.sessionID ? (
                        <Action title="Scan Again to Optimize" icon={Icon.ArrowClockwise} onAction={rescan} />
                      ) : (
                        <>
                          <Action title="Optimize All" icon={Icon.Stars} onAction={() => optimizeAll(bucket)} />
                          <Action
                            title="See by Source"
                            icon={Icon.List}
                            shortcut={Keyboard.Shortcut.Common.Open}
                            onAction={() => launchCommand({ name: "mint-optimize", type: LaunchType.UserInitiated })}
                          />
                        </>
                      )
                    ) : diskSession ? (
                      bucket.key === "safeToClean" ? (
                        <>
                          <Action title="Clean All" icon={Icon.Trash} onAction={() => clean(bucket, left, true)} />
                          <Action.Push
                            title="Choose Items"
                            icon={Icon.List}
                            shortcut={Keyboard.Shortcut.Common.Open}
                            target={
                              <ChooseItems
                                bucket={bucket}
                                entries={left}
                                preselected
                                onClean={(entries, permanent) => clean(bucket, entries, permanent)}
                              />
                            }
                          />
                        </>
                      ) : (
                        <Action.Push
                          title="Choose What to Remove"
                          icon={Icon.List}
                          target={
                            <ChooseItems
                              bucket={bucket}
                              entries={left}
                              preselected={false}
                              onClean={(entries, permanent) => clean(bucket, entries, permanent)}
                            />
                          }
                        />
                      )
                    ) : (
                      <Action title="Scan Again to Clean" icon={Icon.ArrowClockwise} onAction={rescan} />
                    )
                  ) : null}
                  <ActionPanel.Section>
                    {!loading && !busy ? (
                      <Action
                        title="Scan Again"
                        icon={Icon.ArrowClockwise}
                        shortcut={Keyboard.Shortcut.Common.Refresh}
                        onAction={rescan}
                      />
                    ) : null}
                    <Action title="Open Mint" icon={Icon.AppWindow} onAction={openMint} />
                  </ActionPanel.Section>
                </ActionPanel>
              }
            />
          );
        })}
      </List.Section>
    </List>
  );
}

function ChooseItems({
  bucket,
  entries,
  preselected,
  onClean,
}: {
  bucket: Bucket;
  entries: Entry[];
  preselected: boolean;
  onClean: (entries: Entry[], permanent: boolean) => Promise<void>;
}) {
  const { pop } = useNavigation();
  const [chosen, setChosen] = useState<Set<string>>(new Set(preselected ? entries.map((entry) => entry.id) : []));
  const picked = entries.filter((entry) => chosen.has(entry.id));
  const pickedBytes = picked.reduce((sum, entry) => sum + entry.bytes, 0);
  const toggle = (id: string) =>
    setChosen((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  // Back to the group first, so its rows are struck where the person is looking.
  const go = (permanent: boolean) => async () => {
    pop();
    await onClean(picked, permanent);
  };
  return (
    <List
      navigationTitle={picked.length ? `${formatCompact(pickedBytes)} chosen` : bucket.title}
      searchBarPlaceholder={`Search ${bucket.title}`}
    >
      {entries.map((entry) => {
        const isChosen = chosen.has(entry.id);
        return (
          <List.Item
            key={entry.id}
            icon={{ fileIcon: entry.path }}
            title={entry.title}
            subtitle={entry.detail}
            accessories={[
              { text: formatCompact(entry.bytes) },
              {
                icon: {
                  source: isChosen ? Icon.CheckCircle : Icon.Circle,
                  tintColor: isChosen ? Color.PrimaryText : Color.SecondaryText,
                },
              },
            ]}
            actions={
              <ActionPanel>
                <Action
                  title={isChosen ? "Unchoose" : "Choose"}
                  icon={isChosen ? Icon.Circle : Icon.CheckCircle}
                  onAction={() => toggle(entry.id)}
                />
                {picked.length ? (
                  bucket.key === "safeToClean" ? (
                    <Action
                      title="Clean Chosen"
                      icon={Icon.Trash}
                      shortcut={{ modifiers: ["cmd"], key: "return" }}
                      onAction={go(true)}
                    />
                  ) : (
                    <>
                      <Action
                        title="Move Chosen to Trash"
                        icon={Icon.Trash}
                        shortcut={{ modifiers: ["cmd"], key: "return" }}
                        onAction={go(false)}
                      />
                      <Action
                        title="Delete Chosen Permanently"
                        icon={Icon.Trash}
                        style={Action.Style.Destructive}
                        shortcut={{ modifiers: ["cmd", "shift"], key: "return" }}
                        onAction={go(true)}
                      />
                    </>
                  )
                ) : null}
                <Action.ShowInFinder path={entry.path} shortcut={{ modifiers: ["cmd", "shift"], key: "f" }} />
              </ActionPanel>
            }
          />
        );
      })}
    </List>
  );
}
