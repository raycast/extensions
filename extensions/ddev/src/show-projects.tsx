import {
  Action,
  ActionPanel,
  Alert,
  Color,
  Detail,
  Form,
  Icon,
  List,
  Toast,
  confirmAlert,
  showToast,
  useNavigation,
} from "@raycast/api";
import { useExec } from "@raycast/utils";
import { useMemo, useState } from "react";
import { homedir } from "node:os";
import { join } from "node:path";
import {
  ddevEnv,
  deleteSnapshot,
  exportDatabase,
  launchProject,
  parseDescribe,
  parseProjectList,
  parseSnapshotList,
  quickSnapshot,
  renameProject,
  restartProject,
  restoreSnapshot,
  startProject,
  stopProject,
  stopUnlistProject,
  takeSnapshot,
} from "./lib/ddev";
import { launchAndLoginProject } from "./lib/drush";
import { buildDescribeMarkdown } from "./lib/describe-markdown";

type StatusFilter = "all" | "active";

function formatSnapshotTimestamp(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  const y = date.getFullYear();
  const mo = pad(date.getMonth() + 1);
  const d = pad(date.getDate());
  const h = pad(date.getHours());
  const mi = pad(date.getMinutes());
  const s = pad(date.getSeconds());
  return `${y}${mo}${d}-${h}${mi}${s}`;
}

function TakeSnapshotForm({ name, approot, onDone }: { name: string; approot: string; onDone: () => void }) {
  const { pop } = useNavigation();
  const defaultName = `${name}-${formatSnapshotTimestamp(new Date())}`;
  return (
    <Form
      navigationTitle={`Take snapshot of ${name}`}
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="Take Snapshot"
            icon={Icon.Camera}
            onSubmit={async (values: { snapshotName: string }) => {
              const snapshotName = values.snapshotName?.trim();
              if (!snapshotName) {
                await showToast({ style: Toast.Style.Failure, title: "Please enter a snapshot name" });
                return;
              }
              pop();
              await takeSnapshot(snapshotName, approot);
              onDone();
            }}
          />
        </ActionPanel>
      }
    >
      <Form.Description text={`Take a new snapshot of the database for "${name}".`} />
      <Form.TextField id="snapshotName" title="Snapshot Name" defaultValue={defaultName} />
    </Form>
  );
}

function SnapshotListView({ name, approot }: { name: string; approot: string }) {
  const { isLoading, data, error, revalidate } = useExec("ddev", ["snapshot", "--list", "--json-output", name], {
    env: ddevEnv,
    parseOutput: ({ stdout }) => parseSnapshotList(stdout, name),
  });

  const snapshots = data ?? [];

  const takeSnapshotAction = (
    <Action.Push
      title="Take New Snapshot"
      icon={Icon.Plus}
      shortcut={{ modifiers: ["cmd"], key: "n" }}
      target={<TakeSnapshotForm name={name} approot={approot} onDone={revalidate} />}
    />
  );

  return (
    <List isLoading={isLoading} navigationTitle={`Snapshots: ${name}`} searchBarPlaceholder="Search snapshots…">
      {error ? (
        <List.EmptyView icon={Icon.Warning} title="Could not list snapshots" description={error.message} />
      ) : snapshots.length === 0 && !isLoading ? (
        <List.EmptyView
          icon={Icon.Camera}
          title="No snapshots"
          description={`No snapshots exist for ${name}.`}
          actions={<ActionPanel>{takeSnapshotAction}</ActionPanel>}
        />
      ) : (
        snapshots.map((snap) => (
          <List.Item
            key={snap.Name}
            icon={Icon.Camera}
            title={snap.Name}
            accessories={[{ text: new Date(snap.Created).toLocaleString() }]}
            actions={
              <ActionPanel>
                <Action
                  title="Restore Snapshot"
                  icon={Icon.ArrowCounterClockwise}
                  onAction={async () => {
                    const confirmed = await confirmAlert({
                      title: `Restore snapshot "${snap.Name}"?`,
                      message: `This will replace the current database of "${name}" with this snapshot.`,
                      primaryAction: { title: "Restore", style: Alert.ActionStyle.Destructive },
                    });
                    if (!confirmed) return;
                    await restoreSnapshot(snap.Name, approot);
                    revalidate();
                  }}
                />
                <Action
                  title="Delete Snapshot"
                  icon={Icon.Trash}
                  style={Action.Style.Destructive}
                  shortcut={{ modifiers: ["ctrl"], key: "x" }}
                  onAction={async () => {
                    const confirmed = await confirmAlert({
                      title: `Delete snapshot "${snap.Name}"?`,
                      message: "This action cannot be undone.",
                      primaryAction: { title: "Delete", style: Alert.ActionStyle.Destructive },
                    });
                    if (!confirmed) return;
                    await deleteSnapshot(snap.Name, approot);
                    revalidate();
                  }}
                />
                {takeSnapshotAction}
                <Action.CopyToClipboard title="Copy Snapshot Name" content={snap.Name} />
              </ActionPanel>
            }
          />
        ))
      )}
    </List>
  );
}

function DescribeView({ name }: { name: string }) {
  const { isLoading, data, error } = useExec("ddev", ["describe", name, "--json-output"], {
    env: ddevEnv,
    parseOutput: ({ stdout }) => parseDescribe(stdout),
  });

  const markdown = error
    ? `# Could not describe ${name}\n\n\`\`\`\n${error.message}\n\`\`\``
    : data
      ? buildDescribeMarkdown(data)
      : "";

  return <Detail isLoading={isLoading} navigationTitle={`Project: ${name}`} markdown={markdown} />;
}

function RenameProjectForm({ name, approot, onDone }: { name: string; approot: string; onDone: () => void }) {
  const { pop } = useNavigation();
  return (
    <Form
      navigationTitle={`Rename ${name}`}
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="Rename and Restart"
            icon={Icon.Pencil}
            onSubmit={async (values: { newName: string }) => {
              const newName = values.newName?.trim();
              if (!newName) {
                await showToast({ style: Toast.Style.Failure, title: "Please enter a new project name" });
                return;
              }
              if (newName === name) {
                await showToast({ style: Toast.Style.Failure, title: "New name is the same as the current name" });
                return;
              }
              const confirmed = await confirmAlert({
                title: `Rename "${name}" to "${newName}"?`,
                message:
                  "This snapshots, stops, renames, restarts, and restores the project. " +
                  "Do not close this window until the rename has finished, or the project may be left in an incomplete state.",
                primaryAction: { title: "Rename" },
              });
              if (!confirmed) return;
              pop();
              await renameProject(name, newName, approot);
              onDone();
            }}
          />
        </ActionPanel>
      }
    >
      <Form.Description
        text={`Change the project name for "${name}". The project will be restarted after the change is applied.`}
      />
      <Form.TextField id="newName" title="New Project Name" defaultValue={name} placeholder="my-project" />
    </Form>
  );
}

export default function Command() {
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");

  const { isLoading, data, error, revalidate } = useExec("ddev", ["list", "--json-output"], {
    env: ddevEnv,
    parseOutput: ({ stdout }) => parseProjectList(stdout),
  });

  const projects = useMemo(() => {
    const all = data ?? [];
    return statusFilter === "active" ? all.filter((p) => p.status === "running") : all;
  }, [data, statusFilter]);

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder="Search projects by name…"
      searchBarAccessory={
        <List.Dropdown
          tooltip="Filter by status"
          storeValue
          onChange={(value) => setStatusFilter(value as StatusFilter)}
        >
          <List.Dropdown.Item title="All" value="all" />
          <List.Dropdown.Item title="Active" value="active" />
        </List.Dropdown>
      }
    >
      {error ? (
        <List.EmptyView icon={Icon.Warning} title="Could not run ddev list" description={error.message} />
      ) : (
        projects.map((project) => {
          const isActive = project.status === "running";
          const isDrupal = project.type.toLowerCase().startsWith("drupal");
          return (
            <List.Item
              key={project.name}
              title={project.name}
              subtitle={project.type}
              accessories={
                isActive
                  ? [{ icon: { source: Icon.CheckCircle, tintColor: Color.Green }, tooltip: "Active" }]
                  : [{ icon: { source: Icon.CircleDisabled, tintColor: Color.Red }, tooltip: "Active" }]
              }
              actions={
                <ActionPanel>
                  <Action
                    title="Launch Website"
                    icon={Icon.Globe}
                    onAction={() => launchProject(project.name, project.approot)}
                  />
                  {isDrupal && (
                    <ActionPanel.Section title="Drupal Commands">
                      <Action
                        title="Launch Website (and Login)"
                        icon={Icon.Key}
                        shortcut={{ modifiers: ["cmd"], key: "enter" }}
                        onAction={() => launchAndLoginProject(project.name, project.approot)}
                      />
                    </ActionPanel.Section>
                  )}

                  <ActionPanel.Section title="Start / Stop / Restart">
                    <Action
                      title="Start Project"
                      icon={Icon.Play}
                      onAction={async () => {
                        await startProject(project.name);
                        revalidate();
                      }}
                    />
                    <Action
                      title="Stop Project"
                      icon={Icon.Stop}
                      shortcut={{ modifiers: ["ctrl"], key: "x" }}
                      onAction={async () => {
                        await stopProject(project.name);
                        revalidate();
                      }}
                    />
                    <Action
                      title="Stop Project (--Unlist)"
                      icon={Icon.Stop}
                      shortcut={{ modifiers: ["ctrl", "shift"], key: "x" }}
                      onAction={async () => {
                        await stopUnlistProject(project.name);
                        revalidate();
                      }}
                    />

                    <Action
                      title="Restart Project"
                      icon={Icon.ArrowClockwise}
                      onAction={async () => {
                        await restartProject(project.name);
                        revalidate();
                      }}
                    />
                  </ActionPanel.Section>

                  <ActionPanel.Section title="Backup / Restore">
                    <Action.Push
                      title="Show Snapshots"
                      icon={Icon.Camera}
                      shortcut={{ modifiers: ["cmd", "shift"], key: "s" }}
                      target={<SnapshotListView name={project.name} approot={project.approot} />}
                    />
                    {isActive && (
                      <Action
                        title="Take Quick Snapshot"
                        icon={Icon.Plus}
                        shortcut={{ modifiers: ["cmd"], key: "s" }}
                        onAction={async () => {
                          await quickSnapshot(project.name, project.approot);
                        }}
                      />
                    )}
                    {isActive && (
                      <Action
                        title="Export Database"
                        icon={Icon.ArrowUpCircle}
                        onAction={async () => {
                          const file = join(homedir(), "Downloads", `${project.name}.sql`);
                          const confirmed = await confirmAlert({
                            title: `Export database of "${project.name}"?`,
                            message: `The database will be exported to ${file}.`,
                            primaryAction: { title: "Export" },
                          });
                          if (!confirmed) return;
                          await exportDatabase(project.name, file, false);
                        }}
                      />
                    )}
                  </ActionPanel.Section>
                  <ActionPanel.Section title="Other">
                    {isActive && (
                      <Action.Push
                        title="Rename Project"
                        icon={Icon.Pencil}
                        shortcut={{ modifiers: ["cmd"], key: "r" }}
                        target={<RenameProjectForm name={project.name} approot={project.approot} onDone={revalidate} />}
                      />
                    )}
                    <Action.Push
                      title="Show Project Information"
                      shortcut={{ modifiers: ["cmd"], key: "i" }}
                      icon={Icon.Info}
                      target={<DescribeView name={project.name} />}
                    />
                    <Action.ShowInFinder
                      title="Open in Finder"
                      path={project.approot}
                      shortcut={{ modifiers: ["cmd"], key: "f" }}
                    />
                    <Action.CopyToClipboard
                      title="Copy Project Path"
                      content={project.approot}
                      shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
                    />
                  </ActionPanel.Section>
                </ActionPanel>
              }
            />
          );
        })
      )}
    </List>
  );
}
