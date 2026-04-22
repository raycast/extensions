import { useEffect, useMemo, useState } from "react";
import { Action, ActionPanel, Grid, Icon } from "@raycast/api";

import { resolveAppIcon } from "./app-icons";
import { loadGroups } from "./storage";
import { AppGroup } from "./types";

function normalizeTarget(target: string): string {
  if (/^https?:\/\//i.test(target)) return target;
  if (target.startsWith("/") || target.startsWith("~") || target.includes(":\\")) return target;
  return `https://${target}`;
}

export function GroupGrid(props: { groupId: string; title: string; emptyMessage?: string }) {
  const [groups, setGroups] = useState<AppGroup[]>([]);
  const [iconMap, setIconMap] = useState<Record<string, string | undefined>>({});

  useEffect(() => {
    void loadGroups().then(setGroups);
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function loadIcons() {
      const nextIcons: Record<string, string | undefined> = {};
      await Promise.all(
        groups.flatMap((group) =>
          group.apps.map(async (app) => {
            nextIcons[app.id] = await resolveAppIcon(app.target, app.icon);
          })
        )
      );

      if (!cancelled) setIconMap(nextIcons);
    }

    void loadIcons();
    return () => {
      cancelled = true;
    };
  }, [groups]);

  const group = useMemo(() => groups.find((item) => item.id === props.groupId) ?? null, [groups, props.groupId]);

  if (!group) {
    return (
      <Grid navigationTitle={props.title} searchBarPlaceholder="Search apps">
        <Grid.EmptyView
          title={props.title}
          description={props.emptyMessage ?? "This group is not available anymore. Check the command preferences or recreate it in Launch Manager."}
          icon={Icon.ExclamationMark}
        />
      </Grid>
    );
  }

  return (
    <Grid navigationTitle={group.name} searchBarPlaceholder="Search apps">
      {group.apps.map((app) => (
        <Grid.Item
          key={app.id}
          title={app.name}
          subtitle={app.target}
          content={iconMap[app.id] ?? { source: "app-default.png" }}
          actions={
            <ActionPanel>
              <Action.Open title="Open App" target={normalizeTarget(app.target)} />
            </ActionPanel>
          }
        />
      ))}
    </Grid>
  );
}
