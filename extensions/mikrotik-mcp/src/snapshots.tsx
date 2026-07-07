/**
 * Snapshots command — mirrors the dashboard's Snapshots tab: browse stored
 * `/export` config snapshots and time-travel diff any two. Viewing a body fetches
 * the full snapshot (`/api/snapshot/:id`); "Diff Against…" pushes a picker, then
 * renders the server-computed unified diff via the shared DiffDetail.
 */
import {
  Action,
  ActionPanel,
  Detail,
  Icon,
  Keyboard,
  List,
} from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { postJson } from "./lib/api";
import { DiffDetail } from "./lib/diff";
import { bytes, num } from "./lib/format";
import { useApi } from "./lib/hooks";
import type { DiffSummary, Snapshot } from "./lib/types";

function label(s: Snapshot): string {
  return s.label || s.id.slice(0, 12);
}

function SnapshotBody({ snap }: { snap: Snapshot }) {
  const { data, isLoading } = useApi<Snapshot>(`/api/snapshot/${snap.id}`);
  const body = data?.body ?? "";
  const md = body
    ? `\`\`\`\n${body}\n\`\`\``
    : isLoading
      ? "Loading…"
      : "_No body captured._";
  return (
    <Detail
      isLoading={isLoading}
      markdown={md}
      navigationTitle={`${snap.device} · ${label(snap)}`}
      metadata={
        <Detail.Metadata>
          <Detail.Metadata.Label title="Device" text={snap.device} />
          <Detail.Metadata.Label
            title="Captured"
            text={new Date(snap.ts).toLocaleString()}
          />
          {snap.rosVersion ? (
            <Detail.Metadata.Label title="RouterOS" text={snap.rosVersion} />
          ) : null}
          <Detail.Metadata.Label title="Lines" text={num(snap.lines)} />
          <Detail.Metadata.Label title="Size" text={bytes(snap.bytes)} />
          <Detail.Metadata.Label title="SHA" text={snap.sha.slice(0, 12)} />
        </Detail.Metadata>
      }
    />
  );
}

function DiffResult({ from, to }: { from: Snapshot; to: Snapshot }) {
  const { data, isLoading } = usePromise(
    (a: string, b: string) =>
      postJson<{ summary: DiffSummary; unified: string }>(
        "/api/snapshots/diff",
        { from: a, to: b },
      ),
    [from.id, to.id],
  );
  return (
    <DiffDetail
      isLoading={isLoading}
      unified={data?.unified ?? ""}
      summary={data?.summary}
      title={`${from.device} ${label(from)} → ${label(to)}`}
      navigationTitle="Snapshot Diff"
    />
  );
}

function DiffPicker({
  from,
  snapshots,
}: {
  from: Snapshot;
  snapshots: Snapshot[];
}) {
  return (
    <List searchBarPlaceholder="Diff against…">
      {snapshots
        .filter((s) => s.id !== from.id)
        .map((s) => (
          <List.Item
            key={s.id}
            icon={Icon.ArrowRight}
            title={label(s)}
            subtitle={s.device}
            accessories={[{ date: new Date(s.ts) }]}
            actions={
              <ActionPanel>
                <Action.Push
                  title="Show Diff"
                  icon={Icon.Text}
                  target={<DiffResult from={from} to={s} />}
                />
              </ActionPanel>
            }
          />
        ))}
    </List>
  );
}

export default function Command() {
  const { data, isLoading, revalidate } = useApi<{ snapshots: Snapshot[] }>(
    "/api/snapshots",
  );
  const snapshots = data?.snapshots ?? [];
  const byDevice = new Map<string, Snapshot[]>();
  for (const s of snapshots)
    byDevice.set(s.device, [...(byDevice.get(s.device) ?? []), s]);

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Filter snapshots…">
      {[...byDevice.entries()].map(([device, list]) => (
        <List.Section key={device} title={device} subtitle={`${list.length}`}>
          {list.map((s) => (
            <List.Item
              key={s.id}
              icon={Icon.Document}
              title={label(s)}
              subtitle={s.rosVersion}
              accessories={[
                { text: `${num(s.lines)} lines` },
                { text: bytes(s.bytes) },
                { date: new Date(s.ts) },
              ]}
              actions={
                <ActionPanel>
                  <Action.Push
                    title="View Body"
                    icon={Icon.Eye}
                    target={<SnapshotBody snap={s} />}
                  />
                  <Action.Push
                    title="Diff Against…"
                    icon={Icon.Text}
                    target={<DiffPicker from={s} snapshots={snapshots} />}
                  />
                  <Action.CopyToClipboard
                    title="Copy SHA"
                    content={s.sha}
                    shortcut={Keyboard.Shortcut.Common.Copy}
                  />
                  <Action
                    title="Refresh"
                    icon={Icon.ArrowClockwise}
                    onAction={revalidate}
                    shortcut={Keyboard.Shortcut.Common.Refresh}
                  />
                </ActionPanel>
              }
            />
          ))}
        </List.Section>
      ))}
    </List>
  );
}
