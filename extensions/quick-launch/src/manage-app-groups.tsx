import { randomUUID } from "node:crypto";
import { useEffect, useMemo, useState } from "react";
import {
  Action,
  ActionPanel,
  Alert,
  confirmAlert,
  Form,
  Grid,
  Icon,
  useNavigation,
} from "@raycast/api";

import { resolveAppIcon } from "./app-icons";
import { loadGroups, saveGroups } from "./storage";
import { AppEntry, AppGroup } from "./types";

function normalizeTarget(target: string): string {
  if (/^https?:\/\//i.test(target)) return target;
  if (target.startsWith("/") || target.startsWith("~") || target.includes(":\\")) return target;
  return `https://${target}`;
}

function AppForm(props: {
  group: AppGroup;
  app?: AppEntry;
  onSave: (groupId: string, app: AppEntry) => Promise<void>;
}) {
  const { pop } = useNavigation();
  const initial = props.app ?? { id: randomUUID(), name: "", target: "", icon: "" };
  const [name, setName] = useState(initial.name);
  const [target, setTarget] = useState(initial.target);
  const [icon, setIcon] = useState(initial.icon ?? "");

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title={props.app ? "Save App" : "Add App"}
            onSubmit={async (values) => {
              const app = {
                id: initial.id,
                name: String(values.name).trim(),
                target: normalizeTarget(String(values.target).trim()),
                icon: String(values.icon || "").trim() || undefined,
              };
              await props.onSave(props.group.id, app);
              pop();
            }}
          />
        </ActionPanel>
      }
    >
      <Form.TextField id="name" title="Name" value={name} onChange={setName} placeholder="ChatGPT" />
      <Form.TextField id="target" title="Target" value={target} onChange={setTarget} placeholder="https://chat.openai.com or /Applications/Slack.app" />
      <Form.TextField id="icon" title="Icon" value={icon} onChange={setIcon} placeholder="Optional image URL or local path" />
    </Form>
  );
}

function GroupForm(props: { group?: AppGroup; onSave: (group: AppGroup) => Promise<void> }) {
  const { pop } = useNavigation();
  const initial = props.group ?? { id: randomUUID(), name: "", icon: "", apps: [] };

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title={props.group ? "Save Group" : "Create Group"}
            onSubmit={async (values) => {
              await props.onSave({
                ...initial,
                name: String(values.name).trim(),
                icon: String(values.icon || "").trim() || undefined,
              });
              pop();
            }}
          />
        </ActionPanel>
      }
    >
      <Form.TextField id="name" title="Name" defaultValue={initial.name} placeholder="Design Tools" />
      <Form.TextField id="icon" title="Icon" defaultValue={initial.icon ?? ""} placeholder="Optional image URL or local path" />
    </Form>
  );
}

export default function Command() {
  const [groups, setGroups] = useState<AppGroup[]>([]);
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);
  const [iconMap, setIconMap] = useState<Record<string, string | undefined>>({});
  const { push } = useNavigation();

  useEffect(() => {
    void loadGroups().then(setGroups);
  }, []);

  const selectedGroup = useMemo(
    () => groups.find((group) => group.id === selectedGroupId) ?? null,
    [groups, selectedGroupId]
  );

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

  async function persist(nextGroups: AppGroup[]) {
    setGroups(nextGroups);
    await saveGroups(nextGroups);
  }

  async function handleDeleteGroup(groupId: string) {
    const confirmed = await confirmAlert({
      title: "Delete group?",
      message: "This will remove the group and all apps inside it.",
      primaryAction: { title: "Delete", style: Alert.ActionStyle.Destructive },
    });
    if (!confirmed) return;
    await persist(groups.filter((group) => group.id !== groupId));
    if (selectedGroupId === groupId) setSelectedGroupId(null);
  }

  async function saveGroup(group: AppGroup) {
    const exists = groups.some((item) => item.id === group.id);
    const next = exists
      ? groups.map((item) => (item.id === group.id ? group : item))
      : [...groups, group];
    await persist(next);
  }

  async function saveApp(groupId: string, app: AppEntry) {
    const next = groups.map((group) =>
      group.id === groupId
        ? {
            ...group,
            apps: group.apps.some((item) => item.id === app.id)
              ? group.apps.map((item) => (item.id === app.id ? app : item))
              : [...group.apps, app],
          }
        : group
    );
    await persist(next);
  }

  async function deleteApp(groupId: string, appId: string) {
    const next = groups.map((group) =>
      group.id === groupId ? { ...group, apps: group.apps.filter((app) => app.id !== appId) } : group
    );
    await persist(next);
  }

  if (selectedGroup) {
    return (
      <Grid navigationTitle={selectedGroup.name} searchBarPlaceholder="Search apps">
        <Grid.Item
          title="Add App"
          subtitle="Create a new app in this group"
          content={Icon.Plus}
          actions={
            <ActionPanel>
              <Action title="Add App" icon={Icon.Plus} onAction={() => push(<AppForm group={selectedGroup} onSave={saveApp} />)} />
              <Action title="Edit Group" icon={Icon.Pencil} onAction={() => push(<GroupForm group={selectedGroup} onSave={saveGroup} />)} />
              <Action title="Back to groups" icon={Icon.ArrowLeft} onAction={() => setSelectedGroupId(null)} />
            </ActionPanel>
          }
        />
        {selectedGroup.apps.map((app) => (
          <Grid.Item
            key={app.id}
            title={app.name}
            subtitle={app.target}
            content={iconMap[app.id] ?? { source: "app-default.png" }}
            actions={
              <ActionPanel>
                <Action.Open title="Open App" target={normalizeTarget(app.target)} />
                <Action title="Edit App" icon={Icon.Pencil} onAction={() => push(<AppForm group={selectedGroup} app={app} onSave={saveApp} />)} />
                <Action
                  title="Delete App"
                  icon={Icon.Trash}
                  onAction={async () => {
                    const confirmed = await confirmAlert({
                      title: "Delete app?",
                      primaryAction: { title: "Delete", style: Alert.ActionStyle.Destructive },
                    });
                    if (!confirmed) return;
                    await deleteApp(selectedGroup.id, app.id);
                  }}
                />
              </ActionPanel>
            }
          />
        ))}
      </Grid>
    );
  }

  return (
    <Grid navigationTitle="App Groups" searchBarPlaceholder="Search groups">
      <Grid.Item
        title="Create Group"
        content={Icon.Plus}
        actions={
          <ActionPanel>
            <Action title="Create Group" icon={Icon.Plus} onAction={() => push(<GroupForm onSave={saveGroup} />)} />
          </ActionPanel>
        }
      />
      {groups.map((group) => (
        <Grid.Item
          key={group.id}
          title={group.name}
          subtitle={`${group.apps.length} app(s)`}
          content={group.icon ? { source: group.icon } : { source: "group-default.PNG" }}
          actions={
            <ActionPanel>
              <Action title="Open Group" icon={Icon.Folder} onAction={() => setSelectedGroupId(group.id)} />
              <Action title="Add App" icon={Icon.Plus} onAction={() => push(<AppForm group={group} onSave={saveApp} />)} />
              <Action title="Edit Group" icon={Icon.Pencil} onAction={() => push(<GroupForm group={group} onSave={saveGroup} />)} />
              <Action
                title="Delete Group"
                icon={Icon.Trash}
                onAction={() => void handleDeleteGroup(group.id)}
              />
            </ActionPanel>
          }
        />
      ))}
    </Grid>
  );
}
