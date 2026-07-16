import {
  Action,
  ActionPanel,
  Color,
  Icon,
  Keyboard,
  List,
  openExtensionPreferences,
  showToast,
  Toast,
} from "@raycast/api";
import { showFailureToast, useExec } from "@raycast/utils";
import { useMemo, useState } from "react";
import { parseJsonOutput, resolveBinary, runAgentcfg, type StatusEntry } from "./lib/agentcfg";

const KIND_ORDER = ["skill", "hook", "context", "command", "rule"];

const KIND_ICONS: Record<string, Icon> = {
  skill: Icon.Stars,
  hook: Icon.Bolt,
  context: Icon.Document,
  command: Icon.Terminal,
  rule: Icon.CheckList,
};

const STATUS_COLORS: Record<string, Color> = {
  linked: Color.Green,
  copied: Color.Green,
  drifted: Color.Orange,
  unmanaged: Color.Yellow,
  absent: Color.SecondaryText,
  disabled: Color.SecondaryText,
  "plugin-owned": Color.Blue,
  "plugin-sibling": Color.SecondaryText,
  "n/a": Color.SecondaryText,
};

const STATUS_SEVERITY = [
  "drifted",
  "unmanaged",
  "absent",
  "disabled",
  "plugin-sibling",
  "plugin-owned",
  "copied",
  "linked",
  "n/a",
];

interface ItemGroup {
  kind: string;
  name: string;
  path: string;
  entries: StatusEntry[];
}

function worstStatus(entries: StatusEntry[]): string {
  const statuses = entries.map((e) => e.status);
  return STATUS_SEVERITY.find((s) => statuses.includes(s)) ?? statuses[0];
}

export default function ManageItems() {
  const bin = resolveBinary();
  const [target, setTarget] = useState<string>("all");
  const [showDetail, setShowDetail] = useState(false);
  const { data, isLoading, error, revalidate } = useExec(bin ?? "", ["status", "--json"], {
    execute: !!bin,
    parseOutput: (out) => parseJsonOutput<StatusEntry[]>(out),
    onError: async () => {},
  });

  const targets = useMemo(() => [...new Set(data?.map((e) => e.target))].sort(), [data]);

  const groups = useMemo(() => {
    const byItem = new Map<string, ItemGroup>();
    for (const entry of data ?? []) {
      const key = `${entry.kind}/${entry.item}`;
      const group = byItem.get(key) ?? { kind: entry.kind, name: entry.item, path: entry.path ?? "", entries: [] };
      group.entries.push(entry);
      byItem.set(key, group);
    }
    return [...byItem.values()];
  }, [data]);

  if (!bin) {
    return (
      <List>
        <List.EmptyView
          icon={Icon.Warning}
          title="agentcfg binary not found"
          description="Install it with brew, or set its path in the extension preferences (⌘,)."
          actions={
            <ActionPanel>
              <Action.CopyToClipboard title="Copy Install Command" content="brew install jorgenosberg/tap/agentcfg" />
              <Action title="Open Extension Preferences" icon={Icon.Gear} onAction={openExtensionPreferences} />
            </ActionPanel>
          }
        />
      </List>
    );
  }

  if (error) {
    const message = error instanceof Error ? error.message : String(error);
    const needsInit = message.includes("no config found");
    return (
      <List>
        <List.EmptyView
          icon={Icon.Warning}
          title={needsInit ? "agentcfg is not initialized" : "Could not load status"}
          description={
            needsInit ? "Initialize to create the config and source tree, then add targets and items." : message
          }
          actions={
            <ActionPanel>
              {needsInit && (
                <Action
                  icon={Icon.Wand}
                  title="Initialize Agentcfg"
                  onAction={async () => {
                    const toast = await showToast({ style: Toast.Style.Animated, title: "Initializing…" });
                    try {
                      await runAgentcfg(["init", "--no-interactive"]);
                      toast.style = Toast.Style.Success;
                      toast.title = "Initialized";
                      revalidate();
                    } catch (initError) {
                      toast.hide();
                      await showFailureToast(initError, { title: "Initialize failed" });
                    }
                  }}
                />
              )}
              <Action title="Retry" icon={Icon.ArrowClockwise} onAction={revalidate} />
              <Action title="Open Extension Preferences" icon={Icon.Gear} onAction={openExtensionPreferences} />
            </ActionPanel>
          }
        />
      </List>
    );
  }

  async function act(title: string, args: string[]) {
    const toast = await showToast({ style: Toast.Style.Animated, title });
    try {
      const out = await runAgentcfg(args);
      toast.style = Toast.Style.Success;
      toast.message = out.trim().split("\n").slice(-1)[0];
      revalidate();
    } catch (error) {
      toast.hide();
      await showFailureToast(error, { title: `${title} failed` });
    }
  }

  const scope = target === "all" ? [] : ["-t", target];
  const visible = groups.filter((g) => target === "all" || g.entries.some((e) => e.target === target));
  const kinds = KIND_ORDER.filter((k) => visible.some((g) => g.kind === k));

  return (
    <List
      isLoading={isLoading}
      isShowingDetail={showDetail}
      searchBarPlaceholder="Search items…"
      searchBarAccessory={
        <List.Dropdown tooltip="Filter by Target" value={target} onChange={setTarget}>
          <List.Dropdown.Item title="All Targets" value="all" />
          {targets.map((t) => (
            <List.Dropdown.Item key={t} title={t} value={t} />
          ))}
        </List.Dropdown>
      }
    >
      {kinds.map((kind) => (
        <List.Section key={kind} title={`${kind}s`}>
          {visible
            .filter((g) => g.kind === kind)
            .map((group) => {
              const scoped = target === "all" ? group.entries : group.entries.filter((e) => e.target === target);
              const allDisabled = scoped.length > 0 && scoped.every((e) => e.status === "disabled");
              const accessories = [
                ...(allDisabled && target === "all" ? [{ text: "disabled" }] : []),
                ...(target === "all"
                  ? group.entries.map((e) => ({
                      tag: {
                        value: e.status === "disabled" && !allDisabled ? `${e.target} (off)` : e.target,
                        color: STATUS_COLORS[e.status] ?? Color.SecondaryText,
                      },
                      tooltip: e.status,
                    }))
                  : [
                      {
                        tag: {
                          value: scoped[0]?.status ?? "?",
                          color: STATUS_COLORS[scoped[0]?.status] ?? Color.SecondaryText,
                        },
                      },
                    ]),
              ];
              return (
                <List.Item
                  key={`${group.kind}/${group.name}`}
                  icon={
                    allDisabled
                      ? { source: Icon.MinusCircle, tintColor: Color.SecondaryText }
                      : {
                          source: KIND_ICONS[group.kind] ?? Icon.Dot,
                          tintColor: STATUS_COLORS[worstStatus(scoped)] ?? Color.PrimaryText,
                        }
                  }
                  title={group.name}
                  accessories={accessories}
                  detail={
                    <List.Item.Detail
                      metadata={
                        <List.Item.Detail.Metadata>
                          <List.Item.Detail.Metadata.Label title="Item" text={group.name} />
                          <List.Item.Detail.Metadata.Label title="Kind" text={group.kind} />
                          {group.path && <List.Item.Detail.Metadata.Label title="Source" text={group.path} />}
                          <List.Item.Detail.Metadata.Separator />
                          {group.entries.map((e) => (
                            <List.Item.Detail.Metadata.TagList key={e.target} title={e.target}>
                              <List.Item.Detail.Metadata.TagList.Item
                                text={e.plugin ? `${e.status} (${e.plugin})` : e.status}
                                color={STATUS_COLORS[e.status] ?? Color.SecondaryText}
                              />
                            </List.Item.Detail.Metadata.TagList>
                          ))}
                        </List.Item.Detail.Metadata>
                      }
                    />
                  }
                  actions={
                    <ActionPanel>
                      <Action
                        icon={Icon.Sidebar}
                        title={showDetail ? "Hide Details" : "Show Details"}
                        onAction={() => setShowDetail((v) => !v)}
                      />
                      <Action
                        icon={Icon.Switch}
                        title={target === "all" ? "Toggle Item" : `Toggle for ${target}`}
                        onAction={() => act(`Toggling ${group.name}…`, ["toggle", group.name, ...scope])}
                      />
                      {target === "all" && group.entries.length > 1 && (
                        <ActionPanel.Submenu
                          icon={Icon.Switch}
                          title="Toggle for Target…"
                          shortcut={{ modifiers: ["cmd", "shift"], key: "t" }}
                        >
                          {group.entries.map((e) => (
                            <Action
                              key={e.target}
                              icon={{
                                source: e.status === "disabled" ? Icon.Circle : Icon.CheckCircle,
                                tintColor: STATUS_COLORS[e.status] ?? Color.SecondaryText,
                              }}
                              title={`${e.target} (${e.status})`}
                              onAction={() =>
                                act(`Toggling ${group.name} on ${e.target}…`, ["toggle", group.name, "-t", e.target])
                              }
                            />
                          ))}
                        </ActionPanel.Submenu>
                      )}
                      <ActionPanel.Section>
                        <Action
                          icon={Icon.Download}
                          title={target === "all" ? "Install" : `Install to ${target}`}
                          shortcut={{ modifiers: ["cmd"], key: "i" }}
                          onAction={() => act(`Installing ${group.name}…`, ["install", group.name, ...scope])}
                        />
                        <Action
                          icon={Icon.Trash}
                          title={target === "all" ? "Uninstall" : `Uninstall from ${target}`}
                          shortcut={{ modifiers: ["cmd"], key: "backspace" }}
                          onAction={() => act(`Uninstalling ${group.name}…`, ["uninstall", group.name, ...scope])}
                        />
                        <Action
                          icon={Icon.ArrowClockwise}
                          title={target === "all" ? "Sync All Targets" : `Sync ${target}`}
                          shortcut={Keyboard.Shortcut.Common.Save}
                          onAction={() => act("Syncing…", ["sync", ...scope])}
                        />
                      </ActionPanel.Section>
                      {group.path && (
                        <ActionPanel.Section>
                          <Action.Open
                            title="Open in Editor"
                            target={group.path}
                            shortcut={Keyboard.Shortcut.Common.Open}
                          />
                          <Action.ShowInFinder path={group.path} shortcut={{ modifiers: ["cmd"], key: "f" }} />
                          <Action.CopyToClipboard
                            title="Copy Source Path"
                            content={group.path}
                            shortcut={Keyboard.Shortcut.Common.Copy}
                          />
                        </ActionPanel.Section>
                      )}
                      <Action
                        icon={Icon.RotateClockwise}
                        title="Refresh"
                        onAction={revalidate}
                        shortcut={Keyboard.Shortcut.Common.Refresh}
                      />
                    </ActionPanel>
                  }
                />
              );
            })}
        </List.Section>
      ))}
      <List.EmptyView
        icon={Icon.Tray}
        title="No items"
        description="Add files to the agentcfg source tree or run agentcfg import."
      />
    </List>
  );
}
