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
import { summarizeTodayFromIcloud, type DaySummary } from "./lib/glance";
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

function placesLine(summary: DaySummary): string | null {
  if (summary.first_place && summary.last_place) {
    if (summary.first_place === summary.last_place) {
      return summary.first_place;
    }
    return `${summary.first_place} → ${summary.last_place}`;
  }
  return summary.first_place || summary.last_place || null;
}

function notePreview(notes: string[]): string | null {
  if (!notes.length) return null;
  const first = notes[0].replace(/\s+/g, " ").trim();
  const clipped = first.length > 60 ? `${first.slice(0, 57)}…` : first;
  return notes.length === 1 ? clipped : `${clipped} (+${notes.length - 1})`;
}

function hasDayData(summary: DaySummary): boolean {
  return Boolean(
    summary.sleep ||
    summary.first_place ||
    summary.last_place ||
    summary.distance ||
    summary.notes.length,
  );
}

function oneLiner(summary: DaySummary): string {
  const parts: string[] = [];
  if (summary.sleep) parts.push(`${summary.sleep} sleep`);
  const places = placesLine(summary);
  if (places) parts.push(places);
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
  const places = placesLine(summary);

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
  if (places) {
    lines.push(`- **Places** — ${places}`);
  }
  if (summary.distance) {
    lines.push(`- **Distance** — ${summary.distance}`);
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

  lines.push(`_${oneLiner(summary)}_`);
  return lines.join("\n");
}

function metricMarkdown(
  title: string,
  value: string | null,
  emptyHint: string,
): string {
  if (!value) {
    return `# ${title}\n\n_${emptyHint}_`;
  }
  return `# ${title}\n\n**${value}**`;
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
  const places = summary ? placesLine(summary) : null;
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
      return (
        <List.Item.Detail
          markdown={metricMarkdown(
            "Sleep",
            summary.sleep,
            "No sleep recorded for today.",
          )}
        />
      );
    }

    if (id === "places") {
      return (
        <List.Item.Detail
          markdown={metricMarkdown(
            "Places",
            places,
            "No place visits for today.",
          )}
          metadata={
            places ? (
              <List.Item.Detail.Metadata>
                <List.Item.Detail.Metadata.Label
                  title="First"
                  text={summary.first_place ?? "—"}
                  icon={Icon.Pin}
                />
                <List.Item.Detail.Metadata.Separator />
                <List.Item.Detail.Metadata.Label
                  title="Last"
                  text={summary.last_place ?? "—"}
                  icon={Icon.Pin}
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
          markdown={metricMarkdown(
            "Distance",
            summary.distance,
            "No movement distance for today.",
          )}
        />
      );
    }

    if (id === "notes") {
      return <List.Item.Detail markdown={notesMarkdown(summary.notes)} />;
    }

    return <List.Item.Detail markdown={overviewMarkdown(today, summary)} />;
  }, [places, selected, summary, today]);

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
          subtitle={places ?? "—"}
          icon={{ source: Icon.Pin, tintColor: Color.Blue }}
          accessories={
            places ? [{ tag: { value: places, color: Color.Blue } }] : undefined
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
