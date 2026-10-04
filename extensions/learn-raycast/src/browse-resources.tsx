import {
  Action,
  ActionPanel,
  Alert,
  Clipboard,
  Color,
  confirmAlert,
  Detail,
  Icon,
  Keyboard,
  List,
  LocalStorage,
  open,
  showToast,
  Toast,
  useNavigation,
} from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { useRef, useState } from "react";
import path from "node:path";
import { AddResourceForm } from "./add-resource.js";
import { CAPTURE_WORKSPACE_KEY } from "./capture.js";
import { CreateWorkspaceForm } from "./create-workspace.js";
import {
  ingestTerminalCommand,
  startIngestion,
  type IngestAgent,
} from "./ingestion.js";
import {
  listLearnResources,
  listLearnWorkspaces,
  removeLearnResource,
} from "./learn-cli.js";
import { getLearnExecutable } from "./preferences.js";
import { EditTagsForm, ResourceFiltersForm } from "./resource-forms.js";
import {
  EMPTY_FILTERS,
  filterResources,
  resourceOutputPath,
  type LearnResource,
  type ResourceFilters,
} from "./resources.js";

export default function BrowseResources() {
  const executable = getLearnExecutable();
  const { push, pop } = useNavigation();
  const {
    data: workspaces,
    isLoading,
    error,
    revalidate,
  } = usePromise(listLearnWorkspaces, [executable], {
    onError: () => undefined,
  });
  const { data: selected } = usePromise(
    () => LocalStorage.getItem<string>(CAPTURE_WORKSPACE_KEY),
    [],
  );

  function createWorkspace() {
    push(
      <CreateWorkspaceForm
        executable={executable}
        onCreated={async (workspace) => {
          await revalidate();
          pop();
          push(
            <WorkspaceResourceList
              workspace={workspace}
              executable={executable}
            />,
          );
        }}
      />,
    );
  }
  const createAction = (
    <Action
      title="Create Workspace"
      icon={Icon.Plus}
      shortcut={Keyboard.Shortcut.Common.New}
      onAction={createWorkspace}
    />
  );
  return (
    <List isLoading={isLoading} searchBarPlaceholder="Search Learn workspaces">
      <List.EmptyView
        title={
          error
            ? "Could not load workspaces"
            : "Create your first Learn workspace"
        }
        description={
          error?.message ||
          "Collect resources in a workspace for each learning topic."
        }
        actions={
          <ActionPanel>
            {error ? (
              <Action title="Reload Workspaces" onAction={revalidate} />
            ) : (
              createAction
            )}
          </ActionPanel>
        }
      />
      {(workspaces || []).map((workspace) => (
        <List.Item
          key={workspace}
          title={workspace}
          icon={Icon.Folder}
          accessories={
            workspace === selected ? [{ tag: "Capture destination" }] : []
          }
          actions={
            <ActionPanel>
              <Action
                title="Browse Resources"
                icon={Icon.List}
                onAction={() =>
                  push(
                    <WorkspaceResourceList
                      workspace={workspace}
                      executable={executable}
                    />,
                  )
                }
              />
              <Action
                title="Add Resource"
                icon={Icon.Plus}
                onAction={() =>
                  push(
                    <AddResourceForm
                      executable={executable}
                      workspace={workspace}
                      onAdded={async () => {
                        pop();
                        push(
                          <WorkspaceResourceList
                            workspace={workspace}
                            executable={executable}
                          />,
                        );
                      }}
                    />,
                  )
                }
              />
              {createAction}
              <Action
                title="Reload Workspaces"
                icon={Icon.ArrowClockwise}
                onAction={revalidate}
              />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}

const STATUS_COLORS = {
  pending: Color.Yellow,
  ingested: Color.Green,
  failed: Color.Red,
};
const TYPE_ICONS = {
  web: Icon.Globe,
  pdf: Icon.Document,
  video: Icon.Video,
  repos: Icon.Code,
  local: Icon.Folder,
};

export function WorkspaceResourceList({
  workspace,
  executable,
}: {
  workspace: string;
  executable: string;
}) {
  const { push, pop } = useNavigation();
  const [query, setQuery] = useState("");
  const [filters, setFilters] = useState<ResourceFilters>(EMPTY_FILTERS);
  const busy = useRef(false);
  const { data, isLoading, error, revalidate } = usePromise(
    listLearnResources,
    [workspace, executable],
    { onError: () => undefined },
  );
  const resources = data?.resources || [];
  const filtered = filterResources(resources, filters, query);
  const tags = [
    ...new Set(resources.flatMap((resource) => resource.tags)),
  ].sort();
  const hasFilters = Object.values(filters).some(Boolean);
  const counts = resources.reduce(
    (acc, r) => ({ ...acc, [r.status]: acc[r.status] + 1 }),
    { pending: 0, ingested: 0, failed: 0 },
  );

  async function refreshAndPop() {
    await revalidate();
    pop();
  }
  function addResource() {
    push(
      <AddResourceForm
        executable={executable}
        workspace={workspace}
        onAdded={refreshAndPop}
      />,
    );
  }
  function editFilters() {
    push(
      <ResourceFiltersForm
        filters={filters}
        tags={tags}
        onApply={(next) => {
          setFilters(next);
          pop();
        }}
      />,
    );
  }

  async function notify(action: () => Promise<unknown>, title: string) {
    try {
      await action();
    } catch (e) {
      await showToast({
        style: Toast.Style.Failure,
        title,
        message: (e as Error).message,
      });
    }
  }
  async function ingest(agent?: IngestAgent) {
    await notify(async () => {
      await startIngestion(executable, workspace, agent);
      await showToast({
        style: Toast.Style.Success,
        title: "Ingestion started in Terminal",
        message: "Reload resources after it completes",
      });
    }, "Could not start ingestion");
  }

  async function remove(resource: LearnResource, purge: boolean) {
    if (busy.current) return;
    busy.current = true;
    try {
      if (
        !(await confirmAlert({
          title: purge
            ? "Remove Resource and Delete Content?"
            : "Remove Resource?",
          message: `${resource.title || resource.source}\n\n${purge ? `Delete the resource entry and its local content at ${resourceOutputPath(data!.path, resource.output!)}.` : "Remove the resource entry. Any ingested content will be kept."}`,
          primaryAction: {
            title: purge ? "Remove and Delete" : "Remove",
            style: Alert.ActionStyle.Destructive,
          },
        }))
      )
        return;
      await removeLearnResource(workspace, resource.source, purge, executable);
      await showToast({
        style: Toast.Style.Success,
        title: "Resource removed",
        message: purge ? "Local content deleted" : "Local content kept",
      });
      await revalidate();
    } catch (e) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Could not remove resource",
        message: (e as Error).message,
      });
    } finally {
      busy.current = false;
    }
  }

  function workspaceActions() {
    return (
      <ActionPanel.Section title={workspace}>
        <Action
          title="Add Resource"
          icon={Icon.Plus}
          shortcut={Keyboard.Shortcut.Common.New}
          onAction={addResource}
        />
        <Action
          title="Filter Resources"
          icon={Icon.Filter}
          shortcut={{ modifiers: ["cmd"], key: "f" }}
          onAction={editFilters}
        />
        {hasFilters && (
          <Action
            title="Clear Filters"
            onAction={() => setFilters(EMPTY_FILTERS)}
          />
        )}
        <Action
          title="Reload Resources"
          icon={Icon.ArrowClockwise}
          shortcut={Keyboard.Shortcut.Common.Refresh}
          onAction={revalidate}
        />
        {data && (
          <Action.Open title="Open Workspace Folder" target={data.path} />
        )}
        <Action
          title="Use for Browser Capture"
          icon={Icon.Checkmark}
          onAction={() =>
            notify(async () => {
              await LocalStorage.setItem(CAPTURE_WORKSPACE_KEY, workspace);
              await showToast({
                style: Toast.Style.Success,
                title: `Using ${workspace} for capture`,
              });
            }, "Could not select workspace")
          }
        />
        <Action
          title="Ingest Pending Resources in Terminal"
          icon={Icon.Terminal}
          onAction={() => ingest()}
        />
        <ActionPanel.Submenu
          title="Ingest with Agent in Terminal"
          icon={Icon.Terminal}
        >
          {(["claude", "codex", "pi"] as const).map((agent) => (
            <Action
              key={agent}
              title={`Ingest with ${agent}`}
              onAction={() => ingest(agent)}
            />
          ))}
        </ActionPanel.Submenu>
        <Action
          title="Copy Ingestion Command"
          icon={Icon.Clipboard}
          onAction={() =>
            Clipboard.copy(ingestTerminalCommand(executable, workspace))
          }
        />
      </ActionPanel.Section>
    );
  }

  function resourceActions(resource: LearnResource) {
    const output =
      resource.output && data
        ? resourceOutputPath(data.path, resource.output)
        : undefined;
    const relativeOutput =
      output && data ? path.relative(data.path, output) : undefined;
    const canPurge =
      relativeOutput &&
      relativeOutput !== ".." &&
      !relativeOutput.startsWith(`..${path.sep}`) &&
      !path.isAbsolute(relativeOutput);
    return (
      <ActionPanel>
        <ActionPanel.Section title="Resource">
          <Action
            title="Open Original"
            icon={Icon.Globe}
            onAction={() =>
              notify(() => open(resource.source), "Could not open resource")
            }
          />
          {output && (
            <Action
              title="Open Ingested Content"
              icon={Icon.Document}
              onAction={() =>
                notify(() => open(output), "Could not open content")
              }
            />
          )}
          {output && (
            <Action.ShowInFinder
              title="Show Ingested Content in Finder"
              path={output}
            />
          )}
          <Action
            title="View Resource Details"
            icon={Icon.Info}
            onAction={() =>
              push(<ResourceDetails resource={resource} output={output} />)
            }
          />
          <Action.CopyToClipboard
            title="Copy Original URL or Path"
            content={resource.source}
          />
          <Action
            title="Edit Tags"
            icon={Icon.Tag}
            onAction={() =>
              push(
                <EditTagsForm
                  resource={resource}
                  workspace={workspace}
                  executable={executable}
                  onSaved={refreshAndPop}
                />,
              )
            }
          />
          <Action
            title="Remove Resource (Keep Content)"
            icon={Icon.Trash}
            style={Action.Style.Destructive}
            onAction={() => remove(resource, false)}
          />
          {canPurge && (
            <Action
              title="Remove Resource and Delete Content"
              icon={Icon.Trash}
              style={Action.Style.Destructive}
              onAction={() => remove(resource, true)}
            />
          )}
        </ActionPanel.Section>
        {workspaceActions()}
      </ActionPanel>
    );
  }

  return (
    <List
      isLoading={isLoading}
      filtering={false}
      navigationTitle={workspace}
      searchText={query}
      onSearchTextChange={setQuery}
      searchBarPlaceholder="Search titles, URLs, paths, and tags"
      searchBarAccessory={
        <List.Dropdown
          tooltip="Filter by Status"
          value={filters.status}
          onChange={(status) =>
            setFilters((current) => ({ ...current, status }))
          }
        >
          <List.Dropdown.Item title="All Statuses" value="" />
          {(["pending", "ingested", "failed"] as const).map((status) => (
            <List.Dropdown.Item key={status} title={status} value={status} />
          ))}
        </List.Dropdown>
      }
    >
      <List.EmptyView
        title={
          error
            ? "Could not load resources"
            : resources.length
              ? "No matching resources"
              : "No resources yet"
        }
        description={
          error?.message ||
          (resources.length
            ? "Change your search or filters."
            : "Add a URL or local path to this workspace.")
        }
        actions={<ActionPanel>{workspaceActions()}</ActionPanel>}
      />
      <List.Section
        title={`${filtered.length} resources${hasFilters ? ` · ${[filters.status, filters.type, filters.tag].filter(Boolean).join(" / ")}` : ""}`}
        subtitle={`${counts.pending} pending · ${counts.ingested} ingested · ${counts.failed} failed`}
      >
        {filtered.map((resource) => (
          <List.Item
            key={resource.source}
            title={resource.title || resource.source}
            subtitle={resource.title ? resource.source : undefined}
            icon={TYPE_ICONS[resource.type]}
            accessories={[
              ...resource.tags.slice(0, 3).map((tag) => ({ tag })),
              ...(resource.tags.length > 3
                ? [{ text: `+${resource.tags.length - 3}` }]
                : []),
              {
                tag: {
                  value: resource.status,
                  color: STATUS_COLORS[resource.status],
                },
                tooltip: resource.type,
              },
            ]}
            actions={resourceActions(resource)}
          />
        ))}
      </List.Section>
    </List>
  );
}

function ResourceDetails({
  resource,
  output,
}: {
  resource: LearnResource;
  output?: string;
}) {
  return (
    <Detail
      navigationTitle="Resource Details"
      markdown={`# ${resource.title || "Resource"}`}
      metadata={
        <Detail.Metadata>
          <Detail.Metadata.Label title="Original" text={resource.source} />
          <Detail.Metadata.Label title="Status" text={resource.status} />
          <Detail.Metadata.Label title="Type" text={resource.type} />
          <Detail.Metadata.TagList title="Tags">
            {resource.tags.map((tag) => (
              <Detail.Metadata.TagList.Item key={tag} text={tag} />
            ))}
          </Detail.Metadata.TagList>
          {output && (
            <Detail.Metadata.Label title="Local Content" text={output} />
          )}
          {resource.adapter && (
            <Detail.Metadata.Label title="Adapter" text={resource.adapter} />
          )}
          {resource.addedAt && (
            <Detail.Metadata.Label title="Added" text={resource.addedAt} />
          )}
          {resource.ingestedAt && (
            <Detail.Metadata.Label
              title="Ingested"
              text={resource.ingestedAt}
            />
          )}
        </Detail.Metadata>
      }
      actions={
        <ActionPanel>
          <Action.Open title="Open Original" target={resource.source} />
          {output && (
            <Action.Open title="Open Ingested Content" target={output} />
          )}
          <Action.CopyToClipboard
            title="Copy Original URL or Path"
            content={resource.source}
          />
        </ActionPanel>
      }
    />
  );
}
