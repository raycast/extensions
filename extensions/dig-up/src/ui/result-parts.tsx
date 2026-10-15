// The parts of a result both search views use: its icon, its detail (picture, passage or code, and why it matched), and
// its actions (DigUp: Previews.swift PreviewPane and WhyItMatched, SearchPanelView.swift's context menu and keys).

import {
  Action,
  ActionPanel,
  Detail,
  Icon,
  Keyboard,
  LaunchType,
  List,
  launchCommand,
  openExtensionPreferences,
  showToast,
  Toast,
} from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import type { ReactNode } from "react";
import { pathToFileURL } from "node:url";
import type { SetupState } from "../../engine/api";
import { setupActionTitle } from "../lib/copy";
import type { FileKind } from "../../engine/types";
import { api } from "../lib/client";
import type { KindFilter } from "../lib/copy";
import { clock, longDate } from "../lib/format";
import {
  previewMarkdown,
  previewNeeds,
  thumbSpec,
  momentSpan,
  WIDE_BOX,
  type Picture,
  type PreviewParts,
} from "../lib/preview";
import { factsOf, openTitle, type OpenContext, type ResultRow } from "../lib/results";
import { usePictures, useSegmentText, useEditorName, useJumpsToMoments } from "./hooks";
import { openRow } from "./open";
import { preferencesSent } from "./prefs";

/** Each kind's glyph (DigUp's SF Symbols, as Raycast icons). */
export const KIND_ICONS: Record<FileKind, Icon> = {
  screenshot: Icon.Camera,
  image: Icon.Image,
  pdf: Icon.Document,
  doc: Icon.Text,
  audio: Icon.Waveform,
  video: Icon.FilmStrip,
  code: Icon.Code,
};

/** Picture sizes asked of the daemon, in pixels: list icons, grid cells, the detail pane (Retina). */
export const ICON_PIXELS = 96;
export const CELL_PIXELS = 360;
export const PANE_PIXELS = 820;

/** Where a result matched, in words for the metadata: "p. 3 of 120", "0:25 – 0:55 of 3:12", "lines 12–40". */
export function placeText(row: ResultRow): string | null {
  if (row.kind === "code") return row.span;
  if (row.page !== null) return row.info.pages ? `p. ${row.page} of ${row.info.pages}` : `p. ${row.page}`;
  if (row.kind === "audio" || (row.kind === "video" && row.segment === "audio")) return momentSpan(row);
  if (row.moment !== null) return row.duration ? `${clock(row.moment)} of ${clock(row.duration)}` : clock(row.moment);
  if (row.segment === "chunk" && row.loc !== null) {
    const parts = Number(row.info.chunks);
    return Number.isInteger(parts) && parts > 1 ? `Part ${Math.trunc(row.loc)} of ${parts}` : null;
  }
  return null;
}

function MetadataLines({ row, Metadata }: { row: ResultRow; Metadata: typeof List.Item.Detail.Metadata }) {
  const place = placeText(row);
  return (
    <Metadata>
      <Metadata.Label title="Why" text={row.reason} icon={row.matchedMeaning ? Icon.Stars : Icon.Text} />
      {place ? <Metadata.Label title="Where" text={place} /> : null}
      <Metadata.Separator />
      {factsOf(row).map((fact) => (
        <Metadata.Label key={fact.title} title={fact.title} text={fact.text} />
      ))}
      <Metadata.Label title="Modified" text={longDate(row.modified)} />
      <Metadata.Link title="Folder" target={pathToFileURL(row.folderPath).href} text={row.folder} />
    </Metadata>
  );
}

/** The list's detail pane for a result. */
export function ResultDetail({ row, parts }: { row: ResultRow; parts: PreviewParts }) {
  return (
    <List.Item.Detail
      markdown={previewMarkdown(row, parts)}
      metadata={<MetadataLines row={row} Metadata={List.Item.Detail.Metadata} />}
    />
  );
}

/** The same preview as a view of its own (the grid has no detail pane): bigger, with the file's name on top. */
export function ResultDetailView({ row, query, kind }: { row: ResultRow; query: string; kind: KindFilter }) {
  const needs = previewNeeds(row);
  const spec = thumbSpec(row, PANE_PIXELS, true);
  const picture = usePictures(needs.thumb ? [spec] : [], true);
  const text = useSegmentText(row, needs.text !== null);
  const thumb: Picture | null | undefined = needs.thumb ? picture(spec) : null;
  const markdown = `## ${row.title.replace(/[\\`*_[\]<>#]/g, "\\$&")}\n\n${previewMarkdown(row, { thumb, text, box: WIDE_BOX })}`;
  return (
    <Detail
      navigationTitle={row.name}
      markdown={markdown}
      metadata={<MetadataLines row={row} Metadata={Detail.Metadata} />}
      actions={<ResultActions row={row} query={query} kind={kind} grid inDetail />}
    />
  );
}

export interface WeakerFold {
  count: number;
  shown: boolean;
  toggle: () => void;
}

interface ResultActionsProps {
  row: ResultRow;
  /** The query as typed, for Search in Grid / Show All. */
  query: string;
  kind: KindFilter;
  /** The grid (Dig Up Pictures) rather than the list. */
  grid?: boolean;
  /** Inside the pushed detail view (no Show Details there). */
  inDetail?: boolean;
  onToggleDetail?: () => void;
  weaker?: WeakerFold;
  /** More actions after the file's own (the grid's kind filters). */
  children?: ReactNode;
  onRefresh?: () => void;
  setup?: SetupState;
}

/** Opens `name` (a command of this extension), carrying `context`. */
export async function openCommand(name: string, context?: Record<string, unknown>): Promise<void> {
  try {
    await launchCommand({ name, type: LaunchType.UserInitiated, context });
  } catch (error) {
    await showFailureToast(error, { title: "Couldn't open that command" });
  }
}

export async function indexNow(): Promise<void> {
  try {
    await preferencesSent();
    await api("POST /sync", {});
    await showToast({ style: Toast.Style.Success, title: "Looking for new and changed files" });
  } catch (error) {
    await showFailureToast(error, { title: "Dig Up couldn't start indexing" });
  }
}

/** The actions on a result: Open first (↩), Show in Finder second (⌘↩), then Quick Look, copying, and the views. */
export function ResultActions({
  row,
  query,
  kind,
  grid,
  inDetail,
  onToggleDetail,
  weaker,
  children,
  onRefresh,
  setup,
}: ResultActionsProps) {
  const editor = useEditorName(row.kind === "code");
  const jumps = useJumpsToMoments(row);
  const context: OpenContext = { editor, jumpsToMoments: jumps };
  const open = async () => {
    try {
      await openRow(row);
    } catch (error) {
      await showFailureToast(error, { title: `Couldn't open ${row.name}` });
    }
  };
  return (
    <ActionPanel title={row.name}>
      <ActionPanel.Section>
        <Action
          title={openTitle(row, context)}
          icon={row.kind === "code" ? Icon.Code : row.jump ? Icon.Play : Icon.ArrowNe}
          onAction={open}
        />
        <Action.ShowInFinder path={row.path} />
        {/* Quick Look reads the item's quickLook prop: a pushed Detail has none, and the action would draw nothing. */}
        {inDetail ? null : <Action.ToggleQuickLook shortcut={Keyboard.Shortcut.Common.ToggleQuickLook} />}
        <Action.CopyToClipboard
          title="Copy File"
          content={{ file: row.path }}
          shortcut={Keyboard.Shortcut.Common.Copy}
        />
        <Action.CopyToClipboard title="Copy Path" content={row.path} shortcut={Keyboard.Shortcut.Common.CopyPath} />
        <Action.OpenWith path={row.path} shortcut={Keyboard.Shortcut.Common.OpenWith} />
      </ActionPanel.Section>
      <ActionPanel.Section>
        {grid && !inDetail ? (
          <Action.Push
            title="Show Details"
            icon={Icon.Sidebar}
            shortcut={{ modifiers: ["cmd"], key: "d" }}
            target={<ResultDetailView row={row} query={query} kind={kind} />}
          />
        ) : null}
        {!grid ? (
          <Action
            title="Search in Grid"
            icon={Icon.AppWindowGrid3x3}
            shortcut={Keyboard.Shortcut.Common.Open}
            onAction={() => openCommand("search-pictures", { query, kind })}
          />
        ) : null}
        {onToggleDetail ? (
          <Action
            title="Toggle Details"
            icon={Icon.Sidebar}
            shortcut={{ modifiers: ["cmd"], key: "d" }}
            onAction={onToggleDetail}
          />
        ) : null}
        {weaker && weaker.count > 0 ? (
          <Action
            title={weaker.shown ? "Hide Weaker Matches" : `Show ${weaker.count} Weaker Matches`}
            icon={weaker.shown ? Icon.ChevronUp : Icon.ChevronDown}
            shortcut={{ modifiers: ["cmd", "shift"], key: "w" }}
            onAction={weaker.toggle}
          />
        ) : null}
      </ActionPanel.Section>
      {children}
      <DigUpActions onRefresh={onRefresh} setup={setup} />
    </ActionPanel>
  );
}

/** Folders, indexing and preferences: on every view's action panel. */
export function DigUpActions({ onRefresh, setup }: { onRefresh?: () => void; setup?: SetupState } = {}) {
  return (
    <ActionPanel.Section>
      {setup && (setup.state === "missing" || setup.state === "failed") ? <SetupAction setup={setup} /> : null}
      {onRefresh ? (
        <Action
          title="Refresh Results"
          icon={Icon.ArrowClockwise}
          shortcut={Keyboard.Shortcut.Common.Refresh}
          onAction={onRefresh}
        />
      ) : null}
      <Action title="Choose Folders…" icon={Icon.Folder} onAction={() => openCommand("folders")} />
      <Action title="Index Now" icon={Icon.ArrowClockwise} onAction={indexNow} />
      <Action title="Open Extension Preferences" icon={Icon.Gear} onAction={openExtensionPreferences} />
    </ActionPanel.Section>
  );
}

export function SetupAction({ setup, onComplete }: { setup: SetupState; onComplete?: () => void }) {
  return (
    <Action
      title={setupActionTitle(setup)}
      icon={Icon.Download}
      onAction={async () => {
        try {
          await preferencesSent();
          await api("POST /setup", {});
          onComplete?.();
          await showToast({
            style: Toast.Style.Success,
            title: "Setup started",
            message: "You can choose folders while it downloads.",
          });
        } catch (error) {
          await showFailureToast(error, { title: "Couldn't start setup" });
        }
      }}
    />
  );
}
