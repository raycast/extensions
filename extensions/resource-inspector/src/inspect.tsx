import {
  Action,
  ActionPanel,
  Detail,
  Icon,
  launchCommand,
  LaunchType,
  List,
} from "@raycast/api";
import { useEffect, useState } from "react";
import { entities } from "./model";
import { prepare } from "./runtime";
import { ResourceRow, systemSummary, useLive } from "./ui";
import { trackingScope } from "./preferences";
import { scopeLabel } from "./tracking";
export default function Inspect() {
  const live = useLive();
  const [kind, setKind] = useState("app"),
    [sort, setSort] = useState("memory");
  useEffect(() => {
    void prepare()
      .then(() =>
        launchCommand({ name: "record", type: LaunchType.Background }),
      )
      .catch(() => undefined);
  }, []);
  if (live.error && !live.snapshot)
    return (
      <Detail
        markdown={`# Measurements unavailable\n\n${live.error}`}
        actions={
          <ActionPanel>
            <Action title="Try Again" onAction={live.refresh} />
          </ActionPanel>
        }
      />
    );
  const rows = live.snapshot
    ? entities(live.snapshot, live.previous).filter((e) => e.kind === kind)
    : [];
  const score = (e: (typeof rows)[number]) =>
    sort === "cpu"
      ? (e.cpuPercent ?? -1)
      : sort === "disk"
        ? (e.writeDelta ?? -1)
        : (e.memory ?? -1);
  rows.sort((a, b) => score(b) - score(a) || a.name.localeCompare(b.name));
  return (
    <List
      isLoading={!live.snapshot}
      navigationTitle="Resource Inspector"
      searchBarPlaceholder="Search; Enter inspects details"
      searchBarAccessory={
        <List.Dropdown tooltip="Resource Type" value={kind} onChange={setKind}>
          <List.Dropdown.Item title="Apps" value="app" />
          <List.Dropdown.Item title="Processes" value="process" />
          <List.Dropdown.Item title="Containers" value="container" />
        </List.Dropdown>
      }
    >
      <List.Section
        title={
          live.snapshot ? systemSummary(live.snapshot) : "Reading measurements…"
        }
        subtitle={
          live.error
            ? "Refresh failed · values may be stale"
            : `${scopeLabel[trackingScope()]} · refreshes every 5 seconds`
        }
      >
        <List.Item
          title={`Sort by ${sort === "memory" ? "Memory" : sort === "cpu" ? "CPU" : "Disk Writes"}`}
          icon={Icon.ArrowDown}
          subtitle="Change ranking"
          actions={
            <ActionPanel>
              {["memory", "cpu", "disk"].map((value) => (
                <Action
                  key={value}
                  title={`Sort by ${value === "disk" ? "Disk Writes" : value === "cpu" ? "CPU" : "Memory"}`}
                  onAction={() => setSort(value)}
                />
              ))}
            </ActionPanel>
          }
        />
        {kind === "container" && live.snapshot?.containerError && (
          <List.Item
            title="Containers unavailable"
            subtitle={live.snapshot.containerError}
            icon={Icon.Info}
          />
        )}
      </List.Section>
      <List.Section
        title={
          kind === "app"
            ? "Apps · open a row to choose what to close"
            : kind === "container"
              ? "Containers · separate from host memory"
              : "Processes · one target at a time"
        }
      >
        {rows.map((entity) => (
          <ResourceRow
            key={entity.key}
            entity={entity}
            snapshot={live.snapshot!}
          />
        ))}
      </List.Section>
    </List>
  );
}
