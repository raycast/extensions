import {
  Action,
  ActionPanel,
  Color,
  environment,
  Icon,
  List,
  open,
  showToast,
  Toast,
} from "@raycast/api";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  fmtClock,
  fmtDistance,
  fmtHm,
  summarizeTodayFromIcloud,
  type DaySummary,
} from "./lib/glance";
import {
  checkIcloudSetup,
  ICLOUD_SETTINGS_URL,
  TIME_ATLAS_SITE,
  type IcloudSetupFail,
} from "./lib/icloud-status";
import {
  getExtensionPreferences,
  glanceProtoPath,
  toLocalDateString,
} from "./lib/paths";

type MetricId = "overview" | "sleep" | "places" | "distance" | "notes";

type GlanceLoadState =
  | { kind: "loading" }
  | { kind: "ready"; summary: DaySummary }
  | { kind: "setup"; setup: IcloudSetupFail }
  | { kind: "error"; message: string };

function formatFriendlyDate(dateStr: string): string {
  const [y, m, d] = dateStr.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString(undefined, {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

function notePreview(notes: string[]): string | null {
  if (!notes.length) return null;
  const first = notes[0].replace(/\s+/g, " ").trim();
  const clipped = first.length > 60 ? `${first.slice(0, 57)}…` : first;
  return notes.length === 1 ? clipped : `${clipped} (+${notes.length - 1})`;
}

function placesSubtitle(summary: DaySummary): string | null {
  if (!summary.places.length) return null;
  const path = summary.placesSummary;
  if (!path) return null;
  if (path.length <= 48) return path;
  return `${summary.places.length} places`;
}

function hasDayData(summary: DaySummary): boolean {
  return Boolean(
    summary.sleep ||
    summary.places.length ||
    summary.distance ||
    summary.distanceByActivity.length ||
    summary.notes.length,
  );
}

function oneLiner(summary: DaySummary): string {
  const parts: string[] = [];
  if (summary.sleep) parts.push(`${summary.sleep} sleep`);
  if (summary.placesSummary) parts.push(summary.placesSummary);
  if (summary.distance) parts.push(summary.distance);
  if (summary.notes.length) {
    parts.push(
      summary.notes.length === 1 ? "1 note" : `${summary.notes.length} notes`,
    );
  }
  return parts.length ? parts.join(" · ") : "No Time Atlas data for today";
}

function escapeMarkdown(text: string): string {
  return text.replace(/\\/g, "\\\\").replace(/`/g, "\\`");
}

function notesMarkdown(notes: string[]): string {
  if (!notes.length) {
    return `# Notes\n\n_No journal note for today._\n\n_Add one with the **Add Note** command — it will show up here right away._`;
  }
  const heading =
    notes.length === 1 ? `# Notes` : `# Notes\n\n_${notes.length} notes_`;
  const blocks = notes.map(
    (n, i) =>
      (notes.length > 1 ? `### Note ${i + 1}\n\n` : "") + escapeMarkdown(n),
  );
  return `${heading}\n\n${blocks.join("\n\n---\n\n")}`;
}

function overviewMarkdown(dateStr: string, summary: DaySummary): string {
  if (!hasDayData(summary)) {
    return [
      `# ${formatFriendlyDate(dateStr)}`,
      "",
      "No Time Atlas timeline data for this day yet.",
      "",
      "That usually means:",
      "",
      "- Time Atlas hasn’t synced this day to iCloud yet, or",
      "- There’s simply nothing logged for today",
      "",
      "You can still **Add Note** for today — it will appear under Notes after you refresh.",
    ].join("\n");
  }

  const lines = [`# ${formatFriendlyDate(dateStr)}`, "", "## At a glance", ""];

  if (summary.sleep) {
    lines.push(`- **Sleep** — ${summary.sleep}`);
  }
  if (summary.placesSummary) {
    lines.push(`- **Places** — ${summary.placesSummary}`);
  }
  if (summary.distance) {
    lines.push(`- **Distance** — ${summary.distance} active`);
  }
  if (summary.notes.length) {
    lines.push(
      `- **Notes** — ${summary.notes.length === 1 ? "1 note" : `${summary.notes.length} notes`}`,
    );
  }

  if (summary.notes.length) {
    lines.push("", "## Notes", "");
    for (const note of summary.notes) {
      lines.push(`> ${escapeMarkdown(note).replace(/\n/g, "\n> ")}`, "");
    }
  }

  lines.push("", `_${oneLiner(summary)}_`);
  return lines.join("\n");
}

function sleepMarkdown(summary: DaySummary): string {
  if (!summary.sleepSegments.length) {
    return `# Sleep\n\n_No sleep recorded for today._`;
  }

  const lines = [`# Sleep`, ""];
  if (summary.sleep) {
    lines.push(`**${summary.sleep}** asleep (Core + Deep + REM)`, "");
  }

  if (summary.sleepByType.length) {
    lines.push("## By stage", "");
    for (const row of summary.sleepByType) {
      if (!row.asleepSecs && row.typeName === "Awake") {
        lines.push(`- **${row.typeName}** — interruptions only`);
        continue;
      }
      lines.push(`- **${row.typeName}** — ${fmtHm(row.asleepSecs)}`);
    }
    lines.push("");
  }

  lines.push("## Timeline", "");
  for (const seg of summary.sleepSegments) {
    const span = `${fmtClock(seg.start)}–${fmtClock(seg.end)}`;
    const dur = seg.asleepSecs ? fmtHm(seg.asleepSecs) : "—";
    const mark = seg.countsTowardTotal ? "" : " _(excluded from total)_";
    lines.push(`- **${seg.typeName}** · ${span} · ${dur}${mark}`);
  }

  return lines.join("\n");
}

function placesMarkdown(summary: DaySummary): string {
  if (!summary.places.length) {
    return `# Places\n\n_No place visits for today._`;
  }

  const lines = [
    `# Places`,
    "",
    `_${summary.places.length} visit${summary.places.length === 1 ? "" : "s"}_`,
    "",
  ];

  if (summary.placesSummary) {
    lines.push(`**${summary.placesSummary}**`, "");
  }

  lines.push("## Visits", "");
  summary.places.forEach((p, i) => {
    const span = `${fmtClock(p.start)}–${fmtClock(p.end)}`;
    lines.push(`${i + 1}. **${p.name}** · ${span}`);
    if (p.secondaryName) {
      lines.push(`   ${p.secondaryName}`);
    }
  });

  return lines.join("\n");
}

function distanceMarkdown(summary: DaySummary): string {
  if (!summary.distanceByActivity.length) {
    return `# Distance\n\n_No movement distance for today._`;
  }

  const lines = [`# Distance`, ""];

  if (summary.activeDistanceMeters) {
    lines.push(`**${fmtDistance(summary.activeDistanceMeters)}** active`, "");
  }
  if (summary.totalDistanceMeters > summary.activeDistanceMeters) {
    lines.push(`_All modes: ${fmtDistance(summary.totalDistanceMeters)}_`, "");
  }

  lines.push("## By activity", "");
  for (const bucket of summary.distanceByActivity) {
    const bits = [fmtDistance(bucket.distanceMeters)];
    if (bucket.durationSecs) bits.push(fmtHm(bucket.durationSecs));
    if (bucket.steps) bits.push(`${bucket.steps} steps`);
    const kind = bucket.isActive ? "active" : "other";
    lines.push(`- **${bucket.activityName}** (${kind}) — ${bits.join(" · ")}`);
  }

  lines.push("", "## Individual segments", "");
  for (const bucket of summary.distanceByActivity) {
    lines.push(`### ${bucket.activityName}`, "");
    bucket.segments.forEach((seg, i) => {
      const parts: string[] = [];
      if (seg.start != null) {
        const end =
          seg.durationSecs != null ? seg.start + seg.durationSecs : undefined;
        parts.push(
          end != null
            ? `${fmtClock(seg.start)}–${fmtClock(end)}`
            : fmtClock(seg.start),
        );
      }
      if (seg.distanceMeters) parts.push(fmtDistance(seg.distanceMeters));
      if (seg.durationSecs) parts.push(fmtHm(seg.durationSecs));
      if (seg.steps) parts.push(`${seg.steps} steps`);
      lines.push(`${i + 1}. ${parts.join(" · ") || "—"}`);
    });
    lines.push("");
  }

  return lines.join("\n");
}

function setupEmptyIcon(issue: IcloudSetupFail["issue"]): Icon {
  switch (issue) {
    case "no-icloud":
      return Icon.Cloud;
    case "no-timeatlas":
      return Icon.AppWindow;
    default:
      return Icon.Warning;
  }
}

export default function Command() {
  const { icloudPath } = getExtensionPreferences();
  const today = toLocalDateString(new Date());
  const [state, setState] = useState<GlanceLoadState>({ kind: "loading" });
  const [selected, setSelected] = useState<string>("overview");
  const loadIdRef = useRef(0);

  const load = useCallback(async () => {
    const loadId = ++loadIdRef.current;
    setState({ kind: "loading" });
    try {
      const setup = await checkIcloudSetup(icloudPath);
      if (loadId !== loadIdRef.current) return;

      if (!setup.ok) {
        setState({ kind: "setup", setup });
        return;
      }

      const summary = await summarizeTodayFromIcloud(setup.path, today, {
        protoPath: glanceProtoPath(environment.assetsPath),
      });
      if (loadId !== loadIdRef.current) return;

      setState({ kind: "ready", summary });
    } catch (err) {
      if (loadId !== loadIdRef.current) return;
      const message = err instanceof Error ? err.message : String(err);
      setState({ kind: "error", message });
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to load today",
        message,
      });
    }
  }, [icloudPath, today]);

  useEffect(() => {
    void load();
    return () => {
      loadIdRef.current += 1;
    };
  }, [load]);

  const summary = state.kind === "ready" ? state.summary : null;
  const placesSub = summary ? placesSubtitle(summary) : null;
  const notesPreview = summary ? notePreview(summary.notes) : null;
  const line = summary ? oneLiner(summary) : "";
  const notesText = summary?.notes.join("\n\n") ?? "";
  const isLoading = state.kind === "loading";

  const detail = useMemo(() => {
    if (!summary) {
      return <List.Item.Detail isLoading markdown="# Loading…" />;
    }

    const id = (selected || "overview") as MetricId;

    if (id === "sleep") {
      return <List.Item.Detail markdown={sleepMarkdown(summary)} />;
    }

    if (id === "places") {
      return (
        <List.Item.Detail
          markdown={placesMarkdown(summary)}
          metadata={
            summary.places.length ? (
              <List.Item.Detail.Metadata>
                <List.Item.Detail.Metadata.Label
                  title="Visits"
                  text={String(summary.places.length)}
                  icon={Icon.Pin}
                />
                <List.Item.Detail.Metadata.Separator />
                <List.Item.Detail.Metadata.Label
                  title="First"
                  text={summary.places[0]?.name ?? "—"}
                />
                <List.Item.Detail.Metadata.Label
                  title="Last"
                  text={summary.places[summary.places.length - 1]?.name ?? "—"}
                />
              </List.Item.Detail.Metadata>
            ) : undefined
          }
        />
      );
    }

    if (id === "distance") {
      return (
        <List.Item.Detail
          markdown={distanceMarkdown(summary)}
          metadata={
            summary.distanceByActivity.length ? (
              <List.Item.Detail.Metadata>
                <List.Item.Detail.Metadata.Label
                  title="Active"
                  text={
                    summary.activeDistanceMeters
                      ? fmtDistance(summary.activeDistanceMeters)
                      : "—"
                  }
                  icon={Icon.Footprints}
                />
                <List.Item.Detail.Metadata.Separator />
                <List.Item.Detail.Metadata.Label
                  title="All modes"
                  text={
                    summary.totalDistanceMeters
                      ? fmtDistance(summary.totalDistanceMeters)
                      : "—"
                  }
                />
              </List.Item.Detail.Metadata>
            ) : undefined
          }
        />
      );
    }

    if (id === "notes") {
      return <List.Item.Detail markdown={notesMarkdown(summary.notes)} />;
    }

    return <List.Item.Detail markdown={overviewMarkdown(today, summary)} />;
  }, [selected, summary, today]);

  const readyActions = (
    <ActionPanel>
      <Action.CopyToClipboard
        title="Copy Summary"
        content={line || today}
        shortcut={{ modifiers: ["cmd"], key: "c" }}
      />
      {notesText ? (
        <Action.CopyToClipboard
          title="Copy Notes"
          content={notesText}
          shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
        />
      ) : null}
      <Action
        title="Refresh"
        icon={Icon.ArrowClockwise}
        shortcut={{ modifiers: ["cmd"], key: "r" }}
        onAction={() => void load()}
      />
    </ActionPanel>
  );

  const setupActions = (setup: IcloudSetupFail) => (
    <ActionPanel>
      {setup.issue === "no-icloud" ? (
        <Action
          title="Open System Settings"
          icon={Icon.Gear}
          onAction={() => open(ICLOUD_SETTINGS_URL)}
        />
      ) : null}
      {setup.issue === "no-timeatlas" || setup.issue === "not-directory" ? (
        <Action.OpenInBrowser
          title="Open Time Atlas Website"
          url={TIME_ATLAS_SITE}
        />
      ) : null}
      <Action.CopyToClipboard
        title="Copy Expected Folder Path"
        content={setup.path}
      />
      <Action
        title="Recheck Setup"
        icon={Icon.ArrowClockwise}
        shortcut={{ modifiers: ["cmd"], key: "r" }}
        onAction={() => void load()}
      />
    </ActionPanel>
  );

  if (state.kind === "setup") {
    return (
      <List isLoading={false}>
        <List.EmptyView
          icon={setupEmptyIcon(state.setup.issue)}
          title={state.setup.title}
          description={`${state.setup.description}\n\n${state.setup.path}`}
          actions={setupActions(state.setup)}
        />
      </List>
    );
  }

  if (state.kind === "error") {
    return (
      <List isLoading={false}>
        <List.EmptyView
          icon={Icon.Warning}
          title="Couldn’t load today"
          description={state.message}
          actions={
            <ActionPanel>
              <Action
                title="Try Again"
                icon={Icon.ArrowClockwise}
                onAction={() => void load()}
              />
            </ActionPanel>
          }
        />
      </List>
    );
  }

  return (
    <List
      isLoading={isLoading}
      isShowingDetail
      searchBarPlaceholder="Filter metrics…"
      selectedItemId={selected}
      onSelectionChange={(id) => {
        if (id) setSelected(id);
      }}
    >
      <List.Section title={formatFriendlyDate(today)}>
        <List.Item
          id="overview"
          title="Overview"
          subtitle={summary ? oneLiner(summary) : "Loading…"}
          icon={{ source: Icon.AppWindowList, tintColor: Color.Blue }}
          detail={detail}
          actions={readyActions}
        />
        <List.Item
          id="sleep"
          title="Sleep"
          subtitle={summary?.sleep ?? "—"}
          icon={{ source: Icon.Moon, tintColor: Color.Purple }}
          accessories={
            summary?.sleep
              ? [{ tag: { value: summary.sleep, color: Color.Purple } }]
              : undefined
          }
          detail={detail}
          actions={readyActions}
        />
        <List.Item
          id="places"
          title="Places"
          subtitle={placesSub ?? "—"}
          icon={{ source: Icon.Pin, tintColor: Color.Blue }}
          accessories={
            summary?.places.length
              ? [
                  {
                    tag: {
                      value: String(summary.places.length),
                      color: Color.Blue,
                    },
                  },
                ]
              : undefined
          }
          detail={detail}
          actions={readyActions}
        />
        <List.Item
          id="distance"
          title="Distance"
          subtitle={summary?.distance ?? "—"}
          icon={{ source: Icon.Footprints, tintColor: Color.Green }}
          accessories={
            summary?.distance
              ? [{ tag: { value: summary.distance, color: Color.Green } }]
              : undefined
          }
          detail={detail}
          actions={readyActions}
        />
        <List.Item
          id="notes"
          title="Notes"
          subtitle={notesPreview ?? "—"}
          icon={{ source: Icon.Pencil, tintColor: Color.Orange }}
          accessories={
            summary?.notes.length
              ? [
                  {
                    tag: {
                      value:
                        summary.notes.length === 1
                          ? "1 note"
                          : `${summary.notes.length} notes`,
                      color: Color.Orange,
                    },
                  },
                ]
              : undefined
          }
          detail={detail}
          actions={readyActions}
        />
      </List.Section>
    </List>
  );
}
