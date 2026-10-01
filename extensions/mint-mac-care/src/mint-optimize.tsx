import { Action, ActionPanel, Icon, Image, Keyboard, List, Toast, environment, showToast } from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { existsSync } from "node:fs";
import { homedir } from "node:os";
import { useMemo, useRef, useState } from "react";
import { formatCompact, openMint, plural, runMintSurface, shortPath } from "./mint-cli";
import { TIER_COLORS, sourceTitle } from "./mint-model";
import { MissingMint } from "./missing-mint";
import { progressMarkdown, updatingDots } from "./progress-row";
import { useMintCLI } from "./use-mint-cli";
import { newProgressToken, useMintProgress } from "./use-progress";
import { rememberDuration } from "./use-wait";
import {
  OptimizeScan,
  Source,
  baseName,
  expectedSources,
  groupCopies,
  isDone,
  sourcePicture,
  sourcesOf,
  sourcesWithBase,
} from "./mint-panes";
import { savedSourceKeys } from "./mint-saved";
import { useStrike } from "./use-strike";

type OptimizeResult = {
  sharedFiles: number;
  reclaimedBytes: number;
  cancelled: boolean;
  failures?: Array<{ name: string; reason: string }>;
};

const SCAN_KEY = "optimize.scan";
const GREEN = TIER_COLORS.optimizable;
const HOME = homedir();

export default function Command() {
  const { resolution, recheck } = useMintCLI();
  if (resolution.status !== "ready") return <MissingMint resolution={resolution} onRetry={recheck} />;
  return <Optimize cli={resolution.path} />;
}

/**
 * Where space can come back without deleting anything: one row per source,
 * the AI agents first, listed from the first second and filled when Mint
 * answers; the source's duplicate files on the right. ↵ optimizes every
 * source, ⌘↵ the selected one, and the files are struck one by one as they
 * start to share their storage.
 */
function Optimize({ cli }: { cli: string }) {
  const [run, setRun] = useState<{ keys: string[]; ids: string[] } | undefined>();
  const [receipt, setReceipt] = useState<{ keys: string[]; bytes: number } | undefined>();
  // Mint's answer is single-use: after an Optimize, the files it kept need a new look.
  const [spent, setSpent] = useState<string | undefined>();
  const strike = useStrike();
  const token = useRef(newProgressToken());
  const expected = useMemo(() => expectedSources(savedSourceKeys()), []);
  const scan = usePromise(
    async (path: string, progressToken: string) => {
      const started = Date.now();
      const result = await runMintSurface<OptimizeScan>(
        path,
        { action: "disk.optimize.scan", progressToken },
        30 * 60_000,
      );
      rememberDuration(SCAN_KEY, (Date.now() - started) / 1000);
      return result;
    },
    [cli, token.current],
  );
  const progress = useMintProgress(token.current, scan.isLoading, SCAN_KEY);
  const groups = useMemo(() => groupCopies(scan.data?.items ?? []), [scan.data]);
  const sources = useMemo(
    () => (scan.data ? sourcesWithBase(sourcesOf(groups)) : expected),
    [scan.data, groups, expected],
  );
  const total = groups.reduce((sum, group) => sum + group.bytes, 0);

  const rescan = () => {
    token.current = newProgressToken();
    strike.reset();
    setReceipt(undefined);
    scan.revalidate();
  };

  async function optimize(target: Source[]) {
    const chosen = target.flatMap((source) => source.groups);
    if (!scan.data || chosen.length === 0 || run || strike.active) return;
    const ids = chosen.flatMap((group) => group.copies.map((copy) => copy.id));
    const progressToken = newProgressToken();
    const keys = target.map((source) => source.key);
    setRun({ keys, ids });
    setSpent(scan.data.sessionID);
    strike.begin(ids.length, progressToken);
    try {
      const result = await runMintSurface<OptimizeResult>(
        cli,
        { action: "disk.optimize", sessionID: scan.data.sessionID, itemIDs: ids, confirmed: true, progressToken },
        30 * 60_000,
      );
      const failures = result.failures ?? [];
      const refused = new Set(failures.map((failure) => failure.name));
      const done = result.cancelled
        ? []
        : chosen
            .flatMap((group) => group.copies)
            .filter((copy) => !refused.has(copy.path) && !refused.has(baseName(copy.path)))
            .map((copy) => copy.id);
      strike.end(done, () => {
        setRun(undefined);
        setReceipt({ keys, bytes: result.reclaimedBytes });
      });
      if (failures.length) {
        await showToast({
          style: Toast.Style.Failure,
          title: `${plural(failures.length, "file")} left as they were`,
          message: failures[0].reason,
        });
      }
    } catch (error) {
      strike.end([], () => setRun(undefined));
      await showToast({
        style: Toast.Style.Failure,
        title: "Mint could not optimize",
        message: error instanceof Error ? error.message : String(error),
      });
    }
  }

  const appearance = environment.appearance === "light" ? "light" : "dark";
  const placeholder = scan.data
    ? total > 0
      ? `${formatCompact(total)} can come back · nothing is deleted`
      : "Nothing to optimize right now"
    : "Looking for identical copies…";
  const busy = Boolean(run) || strike.active;

  return (
    <List
      isLoading={scan.isLoading || busy}
      isShowingDetail
      navigationTitle="Optimize Storage"
      searchBarPlaceholder={placeholder}
    >
      {scan.error ? (
        <List.EmptyView icon={Icon.Warning} title="Mint could not look for copies" description={scan.error.message} />
      ) : null}
      <List.Section title="Can come back">
        {sources.map((source) => {
          const sourceIDs = source.groups.flatMap((group) => group.copies.map((copy) => copy.id));
          const remaining = source.groups.reduce(
            (sum, group) =>
              sum +
              (isDone(
                group.copies.map((copy) => copy.id),
                strike.struck,
              )
                ? 0
                : group.bytes),
            0,
          );
          const mine = run?.keys.includes(source.key);
          const finished = receipt?.keys.includes(source.key) && !busy;
          const shared = sourceIDs.filter((id) => strike.struck.has(id)).length;
          const freed = source.groups
            .filter((group) =>
              isDone(
                group.copies.map((copy) => copy.id),
                strike.struck,
              ),
            )
            .reduce((sum, group) => sum + group.bytes, 0);
          return (
            <List.Item
              key={source.key}
              id={source.key}
              icon={sourceIcon(source.key)}
              title={sourceTitle(source.key)}
              accessories={
                scan.isLoading
                  ? [{ text: updatingDots() }]
                  : finished && remaining === 0 && freed > 0
                    ? [{ icon: { source: Icon.CheckCircle, tintColor: GREEN } }, { text: `−${formatCompact(freed)}` }]
                    : [{ text: source.groups.length ? formatCompact(remaining) : "None" }]
              }
              detail={
                <List.Item.Detail
                  markdown={
                    scan.isLoading
                      ? progressMarkdown("Looking for identical copies", progress)
                      : sourcePicture(source, sources, appearance, {
                          struck: strike.struck,
                          gone: strike.gone,
                          running: mine ? `Optimizing · ${shared} of ${sourceIDs.length}` : undefined,
                          // Each source states its own share of what came back.
                          receipt: finished ? { bytes: freed, text: "back · nothing deleted" } : undefined,
                        })
                  }
                />
              }
              actions={
                <ActionPanel>
                  {!scan.isLoading && !busy && spent === scan.data?.sessionID && remaining > 0 ? (
                    <Action title="Look Again to Optimize" icon={Icon.ArrowClockwise} onAction={rescan} />
                  ) : null}
                  {!scan.isLoading && !busy && spent !== scan.data?.sessionID && total > 0 ? (
                    <>
                      <Action title="Optimize All" icon={Icon.Stars} onAction={() => optimize(sources)} />
                      {remaining > 0 ? (
                        <Action
                          title={`Optimize ${sourceTitle(source.key)} Only`}
                          icon={Icon.Stars}
                          shortcut={{ modifiers: ["cmd"], key: "return" }}
                          onAction={() => optimize([source])}
                        />
                      ) : null}
                    </>
                  ) : null}
                  {source.groups.length ? (
                    <Action.Push
                      title="Show Every Copy"
                      icon={Icon.List}
                      shortcut={Keyboard.Shortcut.Common.Open}
                      target={<CopyList source={source} />}
                    />
                  ) : null}
                  <ActionPanel.Section>
                    {!scan.isLoading && !busy ? (
                      <Action
                        title="Look Again"
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

/** Every file of a source and where each of its copies is. */
function CopyList({ source }: { source: Source }) {
  return (
    <List navigationTitle={sourceTitle(source.key)} searchBarPlaceholder={`Search ${sourceTitle(source.key)}`}>
      {source.groups.map((group) => (
        <List.Section
          key={group.id}
          title={baseName(group.keeper)}
          subtitle={`${group.copies.length + 1} copies · ${formatCompact(group.bytes)} back`}
        >
          {[group.keeper, ...group.copies.map((copy) => copy.path)].map((path, index) => (
            <List.Item
              key={`${group.id}:${path}`}
              icon={{ fileIcon: path }}
              title={shortPath(path)}
              accessories={[{ text: index === 0 ? "kept as it is" : "shares its storage" }]}
              actions={
                <ActionPanel>
                  <Action.ShowInFinder path={path} />
                </ActionPanel>
              }
            />
          ))}
        </List.Section>
      ))}
    </List>
  );
}

const APP_ICONS: Record<string, string> = {
  "agent:codex": "/Applications/Codex.app",
  "agent:claudeCode": "/Applications/Claude.app",
  "agent:cursor": "/Applications/Cursor.app",
  "agent:chatGPTDesktop": "/Applications/ChatGPT.app",
  "agent:windsurf": "/Applications/Windsurf.app",
  "agent:lmStudio": "/Applications/LM Studio.app",
  "agent:ollama": "/Applications/Ollama.app",
  "agent:kiro": "/Applications/Kiro.app",
};

function sourceIcon(key: string): Image.ImageLike {
  const app = APP_ICONS[key];
  if (app && existsSync(app)) return { fileIcon: app };
  if (key.startsWith("agent:")) return Icon.Terminal;
  if (key === "files") return { fileIcon: HOME };
  if (key === "apps") return { fileIcon: `${HOME}/Library` };
  return Icon.Clock;
}
