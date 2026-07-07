/**
 * Live Feed command — mirrors the dashboard's Live Feed: every MCP tool call in
 * real time. Seeds from `/api/events`, then prepends events pushed over the
 * WebSocket (`useLiveStream`, SSE fallback). Client-side risk + text filtering,
 * a pushable event drawer, and delete/clear (destructive) like the dashboard.
 */
import { useEffect, useMemo, useRef, useState } from "react";
import {
  Action,
  ActionPanel,
  Clipboard,
  Color,
  Detail,
  Icon,
  Keyboard,
  List,
  Toast,
  showToast,
} from "@raycast/api";
import { deleteEvents } from "./lib/api";
import { confirmDestructive, showFailureToast } from "./lib/confirm";
import { RISK_COLOR, clock, ms, riskLabel } from "./lib/format";
import { useApi } from "./lib/hooks";
import { useLiveStream } from "./lib/live";
import type { LiveMode, Risk, ToolEvent } from "./lib/types";

// Kept intentionally modest: the command runs inside a memory-limited Raycast
// worker, so we retain a bounded window of events and coalesce bursts (below).
const CAP = 150;
const FLUSH_MS = 700;
const RISKS: Risk[] = [
  "READ",
  "WRITE",
  "WRITE_IDEMPOTENT",
  "DESTRUCTIVE",
  "DANGEROUS",
];

function pretty(raw: string): string {
  try {
    return JSON.stringify(JSON.parse(raw), null, 2);
  } catch {
    return raw;
  }
}

function EventDetail({ e }: { e: ToolEvent }) {
  const md = [
    `# ${e.tool}`,
    e.reason ? `\n> ${e.reason}` : "",
    e.error ? `\n## Error\n\n\`\`\`\n${e.error}\n\`\`\`` : "",
    `\n## Input\n\n\`\`\`json\n${pretty(e.input)}\n\`\`\``,
    `\n## Output\n\n\`\`\`\n${e.output || "(empty)"}\n\`\`\``,
  ].join("\n");
  return (
    <Detail
      markdown={md}
      navigationTitle={e.tool}
      metadata={
        <Detail.Metadata>
          <Detail.Metadata.TagList title="Risk">
            <Detail.Metadata.TagList.Item
              text={riskLabel(e.risk)}
              color={RISK_COLOR[e.risk]}
            />
          </Detail.Metadata.TagList>
          <Detail.Metadata.Label title="Title" text={e.title} />
          <Detail.Metadata.Label
            title="Time"
            text={new Date(e.ts).toLocaleString()}
          />
          {e.device ? (
            <Detail.Metadata.Label title="Device" text={e.device} />
          ) : null}
          {e.transport ? (
            <Detail.Metadata.Label title="Transport" text={e.transport} />
          ) : null}
          <Detail.Metadata.Label title="Duration" text={ms(e.durationMs)} />
          <Detail.Metadata.Label
            title="Status"
            text={e.isError ? "error" : "ok"}
            icon={{
              source: e.isError ? Icon.XMarkCircle : Icon.CheckCircle,
              tintColor: e.isError ? Color.Red : Color.Green,
            }}
          />
          {e.hasStructured ? (
            <Detail.Metadata.Label
              title="Structured"
              text="renders an MCP App view"
            />
          ) : null}
        </Detail.Metadata>
      }
      actions={
        <ActionPanel>
          <Action.CopyToClipboard title="Copy Output" content={e.output} />
          <Action.CopyToClipboard title="Copy Input" content={e.input} />
        </ActionPanel>
      }
    />
  );
}

export default function Command() {
  const [live, setLive] = useState<ToolEvent[]>([]);
  const [mode, setMode] = useState<LiveMode>("off");
  const [risk, setRisk] = useState<string>("");
  const [query, setQuery] = useState("");
  const [paused, setPaused] = useState(false);
  const pausedRef = useRef(false);
  pausedRef.current = paused;

  const seed = useApi<{ events: ToolEvent[] }>("/api/events?limit=100");

  // Buffer incoming events and flush on an interval so a high-traffic firehose
  // coalesces into ~1 render per FLUSH_MS instead of one render per event (the
  // per-event re-render storm is what drove the worker out of heap).
  const bufRef = useRef<ToolEvent[]>([]);
  useLiveStream((ev) => {
    if (pausedRef.current) return;
    bufRef.current.unshift(ev);
    if (bufRef.current.length > CAP) bufRef.current.length = CAP;
  }, setMode);

  useEffect(() => {
    const id = setInterval(() => {
      if (bufRef.current.length === 0) return;
      const batch = bufRef.current;
      bufRef.current = [];
      setLive((prev) => [...batch, ...prev].slice(0, CAP));
    }, FLUSH_MS);
    return () => clearInterval(id);
  }, []);

  const events = useMemo(() => {
    const seen = new Set<string>();
    const out: ToolEvent[] = [];
    for (const e of [...live, ...(seed.data?.events ?? [])]) {
      if (seen.has(e.id)) continue;
      seen.add(e.id);
      out.push(e);
      if (out.length >= CAP) break;
    }
    return out;
  }, [live, seed.data]);

  const q = query.trim().toLowerCase();
  const filtered = events.filter((e) => {
    if (risk && e.risk !== risk) return false;
    if (!q) return true;
    return `${e.tool} ${e.title} ${e.device ?? ""} ${e.error ?? ""} ${e.output}`
      .toLowerCase()
      .includes(q);
  });

  const modeIcon =
    mode === "ws"
      ? { source: Icon.Bolt, tintColor: Color.Green }
      : mode === "sse"
        ? { source: Icon.Bolt, tintColor: Color.Yellow }
        : { source: Icon.BoltDisabled, tintColor: Color.SecondaryText };

  async function removeOne(e: ToolEvent) {
    try {
      await deleteEvents({ ids: [e.id] });
      setLive((prev) => prev.filter((x) => x.id !== e.id));
      seed.revalidate();
    } catch (err) {
      await showFailureToast(err, { title: "Could not delete event" });
    }
  }

  async function clearAll() {
    const ok = await confirmDestructive({
      title: "Clear all recorded events?",
      message: "Permanently removes every event from the dashboard store.",
      actionTitle: "Clear All",
    });
    if (!ok) return;
    const toast = await showToast({
      style: Toast.Style.Animated,
      title: "Clearing events…",
    });
    try {
      const { removed } = await deleteEvents({ all: true });
      setLive([]);
      seed.revalidate();
      toast.style = Toast.Style.Success;
      toast.title = `Cleared ${removed} events`;
    } catch (err) {
      toast.hide();
      await showFailureToast(err, { title: "Could not clear events" });
    }
  }

  return (
    <List
      isLoading={seed.isLoading}
      filtering={false}
      onSearchTextChange={setQuery}
      searchBarPlaceholder="Search tool / device / output…"
      navigationTitle={`Live Feed · ${mode.toUpperCase()}${paused ? " · paused" : ""}`}
      searchBarAccessory={
        <List.Dropdown tooltip="Risk" value={risk} onChange={setRisk}>
          <List.Dropdown.Item title="All Risks" value="" />
          {RISKS.map((r) => (
            <List.Dropdown.Item key={r} title={riskLabel(r)} value={r} />
          ))}
        </List.Dropdown>
      }
    >
      <List.Section
        title={`${filtered.length} events`}
        subtitle={mode === "off" ? "disconnected" : mode.toUpperCase()}
      >
        {filtered.map((e) => (
          <List.Item
            key={e.id}
            icon={{ source: Icon.Dot, tintColor: RISK_COLOR[e.risk] }}
            title={e.tool}
            subtitle={e.reason ?? e.title}
            accessories={[
              ...(e.device ? [{ tag: e.device }] : []),
              { text: ms(e.durationMs) },
              {
                icon: {
                  source: e.isError ? Icon.XMarkCircle : Icon.CheckCircle,
                  tintColor: e.isError ? Color.Red : Color.Green,
                },
                text: clock(e.ts),
              },
            ]}
            actions={
              <ActionPanel>
                <Action.Push
                  title="View Details"
                  icon={Icon.Eye}
                  target={<EventDetail e={e} />}
                />
                <Action.CopyToClipboard
                  title="Copy Output"
                  content={e.output}
                  shortcut={Keyboard.Shortcut.Common.Copy}
                />
                <Action
                  title={paused ? "Resume Stream" : "Pause Stream"}
                  icon={paused ? Icon.Play : Icon.Pause}
                  onAction={() => setPaused((v) => !v)}
                  shortcut={{
                    macOS: { modifiers: ["cmd", "shift"], key: "p" },
                    Windows: { modifiers: ["ctrl", "shift"], key: "p" },
                  }}
                />
                <Action
                  title="Copy Feed as JSON"
                  icon={Icon.Clipboard}
                  onAction={async () => {
                    await Clipboard.copy(JSON.stringify(filtered, null, 2));
                    await showToast({
                      style: Toast.Style.Success,
                      title: `Copied ${filtered.length} events`,
                    });
                  }}
                />
                <Action
                  title="Delete Event"
                  icon={Icon.Trash}
                  style={Action.Style.Destructive}
                  shortcut={Keyboard.Shortcut.Common.Remove}
                  onAction={() => removeOne(e)}
                />
                <Action
                  title="Clear All Events"
                  icon={Icon.Trash}
                  style={Action.Style.Destructive}
                  onAction={clearAll}
                />
              </ActionPanel>
            }
          />
        ))}
      </List.Section>
      <List.EmptyView
        icon={modeIcon}
        title={mode === "off" ? "Not connected" : "Waiting for tool calls…"}
        description={
          mode === "off"
            ? "Check the Dashboard URL / token, and that the server runs with --dashboard."
            : "Live. Trigger any MCP tool to see it appear here."
        }
      />
    </List>
  );
}
