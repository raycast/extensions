import { Action, ActionPanel, Icon, Image, LaunchType, List, environment, launchCommand } from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { readFile } from "node:fs/promises";
import { homedir } from "node:os";
import { join } from "node:path";
import { useState } from "react";
import { formatCompact, openMint } from "./mint-cli";
import {
  AtlasHistoryLine,
  Grower,
  GrowthView,
  growers,
  parseAtlasHistory,
  usedSeries,
  windowStartIndex,
} from "./mint-model";
import { PANE_WIDTH, accent, markdownImage, trendSVG } from "./mint-visuals";
import { MissingMint } from "./missing-mint";
import { useMintCLI } from "./use-mint-cli";

const WINDOW_DAYS = 7;
/** Smaller moves than this read as noise between two maps. */
const STEADY_BYTES = 50_000_000;
const SUPPORT = join(homedir(), "Library", "Application Support", "Mint");

type Growth = { lines: AtlasHistoryLine[]; paths: Record<string, string[]> };

export default function Command() {
  const { resolution, recheck } = useMintCLI();
  if (resolution.status !== "ready") return <MissingMint resolution={resolution} onRetry={recheck} />;
  return <DiskGrowth />;
}

/**
 * What is growing, from the history Mint keeps of its whole-disk map: the
 * largest growth this week first, each with its size over every map Mint has
 * drawn. Apps and folders, categories, or AI tools.
 */
function DiskGrowth() {
  const [view, setView] = useState<GrowthView>("sources");
  const growth = usePromise(async () => {
    // No file yet is no history; any other failure is said as itself.
    const text = await readFile(join(SUPPORT, "volume-atlas-history.jsonl"), "utf8").catch((error: unknown) => {
      if ((error as NodeJS.ErrnoException)?.code === "ENOENT") return "";
      throw error;
    });
    return { lines: parseAtlasHistory(text), paths: await atlasPaths() } satisfies Growth;
  });
  const lines = growth.data?.lines ?? [];
  const rows = growers(lines, view, WINDOW_DAYS);
  const start = lines.length ? lines[windowStartIndex(lines, WINDOW_DAYS)] : undefined;
  const appearance = environment.appearance === "light" ? "light" : "dark";
  const color = accent(appearance);

  const sections: Array<{ title: string; rows: Grower[] }> = [
    { title: "Grew", rows: rows.filter((row) => (row.change ?? 0) >= STEADY_BYTES) },
    { title: "New among the largest", rows: rows.filter((row) => row.change === undefined && lines.length > 1) },
    { title: "Shrank", rows: rows.filter((row) => (row.change ?? 0) <= -STEADY_BYTES).reverse() },
    {
      title: "About the same",
      rows: rows.filter((row) => row.change !== undefined && Math.abs(row.change) < STEADY_BYTES),
    },
  ];

  const used = usedSeries(lines);
  const usedNow = lines[lines.length - 1]?.usedBytes;
  const usedBefore = start?.usedBytes;
  const usedChange =
    usedNow !== undefined && usedBefore !== undefined && lines.length > 1 ? usedNow - usedBefore : undefined;

  const picture = (title: string, now: number, change: number | undefined, series: Grower["series"]) => {
    const chart = trendSVG({
      appearance,
      value: formatCompact(now),
      change: changeText(change, start, lines.length > 1),
      color,
      points: series,
      windowStart: start ? Date.parse(start.date) : undefined,
      windowLabel: start
        ? sinceText(start.date) === "in 7 days"
          ? "7 days"
          : `since ${shortDate(start.date)}`
        : undefined,
      format: formatCompact,
      startLabel: shortDate(lines[0]?.date),
      endLabel: shortDate(lines[lines.length - 1]?.date),
    });
    return markdownImage(chart.svg, PANE_WIDTH, chart.height, title);
  };

  const actionsFor = (row?: Grower) => (
    <ActionPanel>
      {row && view === "sources" && growth.data?.paths[row.key]?.length ? (
        <Action.ShowInFinder path={growth.data.paths[row.key][0]} />
      ) : null}
      {view === "vendors" ? (
        <Action
          title="Optimize Storage"
          icon={Icon.Stars}
          onAction={() => launchCommand({ name: "mint-optimize", type: LaunchType.UserInitiated })}
        />
      ) : (
        <Action
          title="Free Disk"
          icon={Icon.HardDrive}
          onAction={() => launchCommand({ name: "mint-scan", type: LaunchType.UserInitiated })}
        />
      )}
      <Action title="Open Mint" icon={Icon.AppWindow} onAction={openMint} />
    </ActionPanel>
  );

  return (
    <List
      isLoading={growth.isLoading}
      isShowingDetail={lines.length > 0}
      navigationTitle="Disk Growth"
      searchBarPlaceholder="Search what grew"
      searchBarAccessory={
        <List.Dropdown tooltip="Show" value={view} onChange={(value) => setView(value as GrowthView)}>
          <List.Dropdown.Item title="Apps & Folders" value="sources" />
          <List.Dropdown.Item title="Categories" value="categories" />
          <List.Dropdown.Item title="AI Tools" value="vendors" />
        </List.Dropdown>
      }
    >
      {growth.error ? (
        <List.EmptyView
          icon={Icon.Warning}
          title="Mint's disk history could not be read"
          description={growth.error.message}
          actions={actionsFor()}
        />
      ) : null}
      {!growth.isLoading && !growth.error && lines.length === 0 ? (
        <List.EmptyView
          icon={Icon.LineChart}
          title="No history yet"
          description="Mint draws this after its Scans. Scan once in Free Disk, and again in a few days."
          actions={actionsFor()}
        />
      ) : null}
      {usedNow !== undefined ? (
        <List.Section title="Whole disk">
          <List.Item
            icon={Icon.HardDrive}
            title="Used space"
            accessories={[{ text: usedChange !== undefined ? signed(usedChange) : formatCompact(usedNow) }]}
            detail={<List.Item.Detail markdown={picture("Used space", usedNow, usedChange, used)} />}
            actions={actionsFor()}
          />
        </List.Section>
      ) : null}
      {sections.map((section) =>
        section.rows.length ? (
          <List.Section key={section.title} title={section.title}>
            {section.rows.map((row) => (
              <List.Item
                key={`${view}:${row.key}`}
                icon={rowIcon(view, row, growth.data?.paths[row.key])}
                title={row.title}
                accessories={[
                  row.change === undefined
                    ? { tag: { value: "new", color: color } }
                    : { text: Math.abs(row.change) < STEADY_BYTES ? formatCompact(row.now) : signed(row.change) },
                ]}
                detail={<List.Item.Detail markdown={picture(row.title, row.now, row.change, row.series)} />}
                actions={actionsFor(row)}
              />
            ))}
          </List.Section>
        ) : null,
      )}
    </List>
  );
}

/** Each label of the disk map with its paths, the app first (for its icon), then the largest. */
async function atlasPaths(): Promise<Record<string, string[]>> {
  try {
    const atlas = JSON.parse(await readFile(join(SUPPORT, "volume-atlas-v2.json"), "utf8")) as {
      buckets?: Array<{ entries?: Array<{ label?: string; path?: string; bytes?: number }> }>;
    };
    const byLabel: Record<string, Array<{ path: string; bytes: number }>> = {};
    for (const bucket of atlas.buckets ?? []) {
      for (const entry of bucket.entries ?? []) {
        if (!entry.label || !entry.path || !entry.path.startsWith("/")) continue;
        (byLabel[entry.label] ??= []).push({ path: entry.path, bytes: entry.bytes ?? 0 });
      }
    }
    return Object.fromEntries(
      Object.entries(byLabel).map(([label, entries]) => [
        label,
        entries.sort((a, b) => b.bytes - a.bytes).map((entry) => entry.path),
      ]),
    );
  } catch {
    return {};
  }
}

function rowIcon(view: GrowthView, row: Grower, paths: string[] | undefined): Image.ImageLike {
  if (view === "sources" && paths?.length) return { fileIcon: paths.find((path) => path.endsWith(".app")) ?? paths[0] };
  if (view === "vendors") return Icon.Stars;
  return Icon.Folder;
}

function signed(bytes: number): string {
  return `${bytes >= 0 ? "+" : "−"}${formatCompact(Math.abs(bytes))}`;
}

function changeText(change: number | undefined, start: AtlasHistoryLine | undefined, hasHistory: boolean): string {
  if (!hasHistory || !start) return "one map so far";
  const since = sinceText(start.date);
  if (change === undefined) return `not among the largest ${since}`;
  if (Math.abs(change) < STEADY_BYTES) return `about the same ${since}`;
  return `${signed(change)} ${since}`;
}

function sinceText(date: string): string {
  const days = Math.round((Date.now() - Date.parse(date)) / 86_400_000);
  return days >= 6 && days <= 8 ? "in 7 days" : `since ${shortDate(date)}`;
}

function shortDate(date: string | undefined): string {
  if (!date) return "";
  return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric" }).format(new Date(date));
}
