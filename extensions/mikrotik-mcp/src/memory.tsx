/**
 * Memory command — mirrors the dashboard's Memory tab: the persistent knowledge
 * graph (entities, relations, observations) plus type breakdowns and the activity
 * log. Entities are browsable/searchable; each entity's detail shows its
 * observations and incoming/outgoing relations; deletion is gated + destructive.
 */
import {
  Action,
  ActionPanel,
  Color,
  Detail,
  Icon,
  Keyboard,
  List,
  Toast,
  showToast,
} from "@raycast/api";
import { deleteJson } from "./lib/api";
import { confirmDestructive, showFailureToast } from "./lib/confirm";
import { num } from "./lib/format";
import { useCallback } from "react";
import { useApi, usePolling } from "./lib/hooks";
import type {
  MemoryActivityEntry,
  MemoryConfig,
  MemoryEntity,
  MemoryGraph,
  MemoryStats,
} from "./lib/types";

const PALETTE = [
  Color.Blue,
  Color.Green,
  Color.Magenta,
  Color.Orange,
  Color.Purple,
  Color.Yellow,
  Color.Red,
];
function typeColor(type: string): Color {
  let h = 0;
  for (const ch of type) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return PALETTE[h % PALETTE.length];
}

function StatsView({
  stats,
  config,
}: {
  stats: MemoryStats | undefined;
  config: MemoryConfig | undefined;
}) {
  return (
    <Detail
      markdown={`# Knowledge Graph\n\n${config?.dbPath ? `Database: \`${config.dbPath}\`` : ""}`}
      navigationTitle="Memory · Stats"
      metadata={
        stats ? (
          <Detail.Metadata>
            <Detail.Metadata.Label
              title="Entities"
              text={num(stats.entities)}
            />
            <Detail.Metadata.Label
              title="Relations"
              text={num(stats.relations)}
            />
            <Detail.Metadata.Label
              title="Observations"
              text={num(stats.observations)}
            />
            <Detail.Metadata.Separator />
            <Detail.Metadata.TagList title="Entity types">
              {stats.entityTypes.map((t) => (
                <Detail.Metadata.TagList.Item
                  key={t.type}
                  text={`${t.type} ${t.count}`}
                  color={typeColor(t.type)}
                />
              ))}
            </Detail.Metadata.TagList>
            <Detail.Metadata.TagList title="Relation types">
              {stats.relationTypes.map((t) => (
                <Detail.Metadata.TagList.Item
                  key={t.type}
                  text={`${t.type} ${t.count}`}
                />
              ))}
            </Detail.Metadata.TagList>
          </Detail.Metadata>
        ) : null
      }
    />
  );
}

function ActivityView({ activity }: { activity: MemoryActivityEntry[] }) {
  return (
    <List
      searchBarPlaceholder="Filter activity…"
      navigationTitle="Memory · Activity"
    >
      {activity.map((a) => (
        <List.Item
          key={a.id}
          icon={Icon.Clock}
          title={a.action}
          subtitle={a.subject}
          accessories={[{ text: a.detail }, { date: new Date(a.ts) }]}
        />
      ))}
    </List>
  );
}

function EntityDetail({
  entity,
  graph,
  onDelete,
}: {
  entity: MemoryEntity;
  graph: MemoryGraph;
  onDelete: (name: string) => void;
}) {
  const outgoing = graph.relations.filter((r) => r.from === entity.name);
  const incoming = graph.relations.filter((r) => r.to === entity.name);
  const md = [
    `# ${entity.name}`,
    ``,
    `## Observations`,
    ``,
    entity.observations.length
      ? entity.observations.map((o) => `- ${o}`).join("\n")
      : "_None._",
  ].join("\n");
  return (
    <Detail
      markdown={md}
      navigationTitle={entity.name}
      metadata={
        <Detail.Metadata>
          <Detail.Metadata.Label
            title="Type"
            text={entity.entityType}
            icon={{
              source: Icon.Circle,
              tintColor: typeColor(entity.entityType),
            }}
          />
          <Detail.Metadata.Label
            title="Observations"
            text={num(entity.observations.length)}
          />
          <Detail.Metadata.Label
            title="Created"
            text={new Date(entity.createdAt).toLocaleString()}
          />
          {outgoing.length ? (
            <Detail.Metadata.TagList title="Outgoing">
              {outgoing.map((r) => (
                <Detail.Metadata.TagList.Item
                  key={`${r.relationType}-${r.to}`}
                  text={`${r.relationType} → ${r.to}`}
                />
              ))}
            </Detail.Metadata.TagList>
          ) : null}
          {incoming.length ? (
            <Detail.Metadata.TagList title="Incoming">
              {incoming.map((r) => (
                <Detail.Metadata.TagList.Item
                  key={`${r.from}-${r.relationType}`}
                  text={`${r.from} → ${r.relationType}`}
                />
              ))}
            </Detail.Metadata.TagList>
          ) : null}
        </Detail.Metadata>
      }
      actions={
        <ActionPanel>
          <Action.CopyToClipboard
            title="Copy Name"
            content={entity.name}
            shortcut={Keyboard.Shortcut.Common.Copy}
          />
          <Action
            title="Delete Entity"
            icon={Icon.Trash}
            style={Action.Style.Destructive}
            shortcut={Keyboard.Shortcut.Common.Remove}
            onAction={() => onDelete(entity.name)}
          />
        </ActionPanel>
      }
    />
  );
}

export default function Command() {
  const graphQ = useApi<MemoryGraph>("/api/memory/graph");
  const statsQ = useApi<MemoryStats>("/api/memory/stats");
  const configQ = useApi<MemoryConfig>("/api/memory/config");
  const activityQ = useApi<MemoryActivityEntry[]>(
    "/api/memory/activity?limit=50",
  );
  const graph = graphQ.data ?? { entities: [], relations: [] };
  const refresh = useCallback(() => {
    graphQ.revalidate();
    statsQ.revalidate();
    configQ.revalidate();
    activityQ.revalidate();
  }, [
    graphQ.revalidate,
    statsQ.revalidate,
    configQ.revalidate,
    activityQ.revalidate,
  ]);
  usePolling(refresh, 8000);

  async function del(name: string) {
    const ok = await confirmDestructive({
      title: `Delete entity “${name}”?`,
      message:
        "This removes the entity and its observations from the knowledge graph.",
      actionTitle: "Delete",
    });
    if (!ok) return;
    const toast = await showToast({
      style: Toast.Style.Animated,
      title: `Deleting ${name}…`,
    });
    try {
      const res = await deleteJson<{ removed?: number; error?: string }>(
        "/api/memory/entities",
        { names: [name] },
      );
      if (res.error) throw new Error(res.error);
      toast.style = Toast.Style.Success;
      toast.title = `Deleted ${name}`;
      graphQ.revalidate();
      statsQ.revalidate();
    } catch (e) {
      toast.hide();
      await showFailureToast(e, { title: `Could not delete ${name}` });
    }
  }

  return (
    <List
      isLoading={graphQ.isLoading}
      searchBarPlaceholder="Search entities…"
      actions={
        <ActionPanel>
          <Action.Push
            title="Stats"
            icon={Icon.BarChart}
            target={<StatsView stats={statsQ.data} config={configQ.data} />}
          />
          <Action.Push
            title="Activity"
            icon={Icon.Clock}
            target={<ActivityView activity={activityQ.data ?? []} />}
          />
        </ActionPanel>
      }
    >
      <List.Section title="Entities" subtitle={`${graph.entities.length}`}>
        {graph.entities.map((e) => (
          <List.Item
            key={e.name}
            icon={{ source: Icon.Circle, tintColor: typeColor(e.entityType) }}
            title={e.name}
            subtitle={e.entityType}
            keywords={[e.entityType]}
            accessories={[
              { text: `${e.observations.length} obs` },
              { date: new Date(e.updatedAt) },
            ]}
            actions={
              <ActionPanel>
                <Action.Push
                  title="View Entity"
                  icon={Icon.Eye}
                  target={
                    <EntityDetail entity={e} graph={graph} onDelete={del} />
                  }
                />
                <Action.Push
                  title="Stats"
                  icon={Icon.BarChart}
                  target={
                    <StatsView stats={statsQ.data} config={configQ.data} />
                  }
                />
                <Action.Push
                  title="Activity"
                  icon={Icon.Clock}
                  target={<ActivityView activity={activityQ.data ?? []} />}
                />
                <Action
                  title="Delete Entity"
                  icon={Icon.Trash}
                  style={Action.Style.Destructive}
                  shortcut={Keyboard.Shortcut.Common.Remove}
                  onAction={() => del(e.name)}
                />
              </ActionPanel>
            }
          />
        ))}
      </List.Section>
    </List>
  );
}
