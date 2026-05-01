import {
  ActionPanel,
  Action,
  List,
  Icon,
  Color,
  showToast,
  Toast,
  confirmAlert,
  Alert,
  Form,
  Clipboard,
  useNavigation,
  open,
} from "@raycast/api";
import { useCachedPromise, useLocalStorage } from "@raycast/utils";
import {
  getMyWorkItems,
  getWorkItemStates,
  getWorkItemChildren,
  updateWorkItemState,
  getWebUrl,
  getRepositories,
  createBranchForWorkItem,
  Repository,
  WorkItem,
} from "./lib/azure-devops";
import { useEffect, useState } from "react";

const TYPE_ICONS: Record<string, { icon: Icon; tintColor: Color }> = {
  Bug: { icon: Icon.Bug, tintColor: Color.Red },
  Task: { icon: Icon.Checkmark, tintColor: Color.Yellow },
  "User Story": { icon: Icon.Bookmark, tintColor: Color.Blue },
  Feature: { icon: Icon.Star, tintColor: Color.Purple },
  Epic: { icon: Icon.Trophy, tintColor: Color.Orange },
  Issue: { icon: Icon.ExclamationMark, tintColor: Color.Red },
};

const STATE_COLORS: Record<string, Color> = {
  New: Color.Blue,
  Active: Color.Green,
  Doing: Color.Green,
  "In Progress": Color.Green,
  Resolved: Color.Purple,
  "Code Review": Color.Purple,
  Testing: Color.Yellow,
  Closed: Color.SecondaryText,
  Done: Color.SecondaryText,
  Removed: Color.SecondaryText,
};

function getTypeAccessory(type: string) {
  return (
    TYPE_ICONS[type] ?? { icon: Icon.Document, tintColor: Color.PrimaryText }
  );
}

function getStateColor(state: string): Color {
  return STATE_COLORS[state] ?? Color.PrimaryText;
}

function formatRelative(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

const STATE_ORDER = ["doing", "todo", "demo", "development", "production"];
function normalizeState(s: string): string {
  return s.toLowerCase().replace(/\s+/g, "");
}
function stateOrderIndex(state: string): number {
  const idx = STATE_ORDER.indexOf(normalizeState(state));
  return idx === -1 ? STATE_ORDER.length : idx;
}

function slugify(s: string): string {
  return s
    .toLowerCase()
    .replace(/æ/g, "ae")
    .replace(/ø/g, "oe")
    .replace(/å/g, "aa")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function getBranchName(item: WorkItem): string {
  const prefix = `${item.id}-`;
  const maxSlug = Math.max(20, 80 - prefix.length);
  return (prefix + slugify(item.title).slice(0, maxSlug)).replace(/-+$/, "");
}

export default function Command() {
  const [filter, setFilter] = useState<string>("all");
  const [showDetail, setShowDetail] = useState<boolean>(false);

  const { value: hiddenStates, setValue: setHiddenStates } = useLocalStorage<
    string[]
  >("hiddenStates", []);

  const { data, isLoading, revalidate, mutate } = useCachedPromise(
    getMyWorkItems,
    [],
    {
      initialData: [],
      keepPreviousData: true,
      onError: (err) => {
        showToast({
          style: Toast.Style.Failure,
          title: "Failed to load work items",
          message: err.message,
        });
      },
    },
  );

  const items = data ?? [];
  const hidden = hiddenStates ?? [];

  const projects = Array.from(new Set(items.map((i) => i.project))).sort();
  const types = Array.from(new Set(items.map((i) => i.workItemType))).sort();
  const allStates = Array.from(
    new Set([...items.map((i) => i.state), ...hidden]),
  ).sort();

  const filtered = items.filter((item) => {
    if (hidden.includes(item.state)) return false;
    if (filter === "all") return true;
    if (filter.startsWith("type:"))
      return item.workItemType === filter.slice(5);
    if (filter.startsWith("project:")) return item.project === filter.slice(8);
    return true;
  });

  const groups = new Map<string, WorkItem[]>();
  for (const item of filtered) {
    const list = groups.get(item.state) ?? [];
    list.push(item);
    groups.set(item.state, list);
  }
  const groupKeys = Array.from(groups.keys()).sort((a, b) => {
    const ai = stateOrderIndex(a);
    const bi = stateOrderIndex(b);
    return ai !== bi ? ai - bi : a.localeCompare(b);
  });

  const onItemUpdated = (updated: WorkItem) => {
    mutate(
      Promise.resolve(items.map((i) => (i.id === updated.id ? updated : i))),
      {
        optimisticUpdate: () =>
          items.map((i) => (i.id === updated.id ? updated : i)),
      },
    );
  };

  return (
    <List
      isLoading={isLoading}
      isShowingDetail={showDetail}
      searchBarPlaceholder="Search work items by title, ID, or tag..."
      searchBarAccessory={
        <List.Dropdown tooltip="Filter" value={filter} onChange={setFilter}>
          <List.Dropdown.Item title="All" value="all" />
          {types.length > 0 && (
            <List.Dropdown.Section title="Type">
              {types.map((t) => (
                <List.Dropdown.Item
                  key={`type:${t}`}
                  title={t}
                  value={`type:${t}`}
                />
              ))}
            </List.Dropdown.Section>
          )}
          {projects.length > 1 && (
            <List.Dropdown.Section title="Project">
              {projects.map((p) => (
                <List.Dropdown.Item
                  key={`project:${p}`}
                  title={p}
                  value={`project:${p}`}
                />
              ))}
            </List.Dropdown.Section>
          )}
        </List.Dropdown>
      }
    >
      {filtered.length === 0 && !isLoading && (
        <List.EmptyView
          icon={Icon.CheckCircle}
          title="No active work items"
          description="Nothing assigned to you that's open. Nice."
        />
      )}

      {groupKeys.map((key) => (
        <List.Section
          key={key}
          title={key}
          subtitle={String(groups.get(key)!.length)}
        >
          {groups.get(key)!.map((item) => (
            <WorkItemRow
              key={item.id}
              item={item}
              onChange={() => revalidate()}
              onItemUpdated={onItemUpdated}
              showDetail={showDetail}
              onToggleDetail={() => setShowDetail((v) => !v)}
              allStates={allStates}
              hiddenStates={hidden}
              onSaveHidden={setHiddenStates}
            />
          ))}
        </List.Section>
      ))}
    </List>
  );
}

function WorkItemRow({
  item,
  onChange,
  onItemUpdated,
  showDetail,
  onToggleDetail,
  allStates,
  hiddenStates,
  onSaveHidden,
}: {
  item: WorkItem;
  onChange: () => void;
  onItemUpdated: (updated: WorkItem) => void;
  showDetail: boolean;
  onToggleDetail: () => void;
  allStates: string[];
  hiddenStates: string[];
  onSaveHidden: (next: string[]) => Promise<void>;
}) {
  const typeAcc = getTypeAccessory(item.workItemType);

  return (
    <List.Item
      icon={{ source: typeAcc.icon, tintColor: typeAcc.tintColor }}
      title={item.title}
      subtitle={`#${item.id}`}
      keywords={[
        String(item.id),
        item.workItemType,
        ...item.tags,
        item.project,
      ]}
      accessories={[
        ...(item.priority ? [{ text: `P${item.priority}` }] : []),
        {
          tag: { value: item.state, color: getStateColor(item.state) },
        },
        {
          date: new Date(item.changedDate),
          tooltip: `Changed ${formatRelative(item.changedDate)}`,
        },
      ]}
      detail={<WorkItemDetail item={item} />}
      actions={
        <ActionPanel>
          <ActionPanel.Section>
            <Action.Push
              title="Open"
              icon={Icon.ArrowRight}
              target={<WorkItemView item={item} onUpdated={onItemUpdated} />}
            />
            <Action.Push
              title="Change State"
              icon={Icon.Pencil}
              shortcut={{ modifiers: ["cmd", "shift"], key: "s" }}
              target={<ChangeStateView item={item} onUpdated={onItemUpdated} />}
            />
            <Action.OpenInBrowser
              title="Open in Azure Devops"
              url={getWebUrl(item)}
              shortcut={{ modifiers: ["cmd"], key: "o" }}
            />
            <Action
              title={showDetail ? "Hide Details" : "Show Details"}
              icon={Icon.Sidebar}
              onAction={onToggleDetail}
              shortcut={{ modifiers: ["cmd", "shift"], key: "d" }}
            />
          </ActionPanel.Section>
          <ActionPanel.Section>
            <Action.Push
              title="Create Branch"
              icon={Icon.NewDocument}
              shortcut={{ modifiers: ["cmd", "shift"], key: "b" }}
              target={<CreateBranchForm item={item} />}
            />
            <Action.CopyToClipboard
              title="Copy Branch Name"
              icon={Icon.CodeBlock}
              content={getBranchName(item)}
              shortcut={{ modifiers: ["cmd", "opt"], key: "b" }}
            />
            <Action.CopyToClipboard
              title="Copy Id"
              content={String(item.id)}
              shortcut={{ modifiers: ["cmd"], key: "." }}
            />
            <Action.CopyToClipboard
              title="Copy Title"
              content={item.title}
              shortcut={{ modifiers: ["cmd", "shift"], key: "." }}
            />
            <Action.CopyToClipboard
              title="Copy URL"
              content={getWebUrl(item)}
              shortcut={{ modifiers: ["cmd", "shift"], key: "," }}
            />
            <Action.CopyToClipboard
              title="Copy as Markdown Link"
              content={`[#${item.id} ${item.title}](${getWebUrl(item)})`}
              shortcut={{ modifiers: ["cmd", "opt"], key: "." }}
            />
          </ActionPanel.Section>
          <ActionPanel.Section>
            <Action
              title="Refresh"
              icon={Icon.ArrowClockwise}
              onAction={onChange}
              shortcut={{ modifiers: ["cmd"], key: "r" }}
            />
            <Action.Push
              title="Settings"
              icon={Icon.Gear}
              shortcut={{ modifiers: ["cmd", "opt"], key: "," }}
              target={
                <SettingsView
                  availableStates={allStates}
                  currentHidden={hiddenStates}
                  onSave={onSaveHidden}
                />
              }
            />
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
}

function WorkItemView({
  item,
  onUpdated,
}: {
  item: WorkItem;
  onUpdated?: (updated: WorkItem) => void;
}) {
  const [current, setCurrent] = useState<WorkItem>(item);

  const {
    data: children,
    isLoading,
    mutate: mutateChildren,
  } = useCachedPromise(getWorkItemChildren, [current.id], {
    initialData: [] as WorkItem[],
    keepPreviousData: false,
  });

  const childList = children ?? [];
  const typeAcc = getTypeAccessory(current.workItemType);

  const handleSelfUpdated = (updated: WorkItem) => {
    setCurrent(updated);
    onUpdated?.(updated);
  };

  const handleChildUpdated = (updated: WorkItem) => {
    const next = childList.map((c) => (c.id === updated.id ? updated : c));
    mutateChildren(Promise.resolve(next), {
      optimisticUpdate: () => next,
    });
  };

  return (
    <List
      isLoading={isLoading}
      isShowingDetail
      navigationTitle={`#${current.id} · ${current.workItemType}`}
      searchBarPlaceholder="Search children…"
    >
      <List.Section title="Item">
        <List.Item
          icon={{ source: typeAcc.icon, tintColor: typeAcc.tintColor }}
          title={current.title}
          subtitle={`#${current.id}`}
          accessories={[
            {
              tag: {
                value: current.state,
                color: getStateColor(current.state),
              },
            },
          ]}
          detail={<WorkItemDetail item={current} withChildren={false} />}
          actions={
            <ActionPanel>
              <ActionPanel.Section>
                <Action.Push
                  title="Change State"
                  icon={Icon.Pencil}
                  shortcut={{ modifiers: ["cmd", "shift"], key: "s" }}
                  target={
                    <ChangeStateView
                      item={current}
                      onUpdated={handleSelfUpdated}
                    />
                  }
                />
                <Action.OpenInBrowser
                  title="Open in Azure Devops"
                  url={getWebUrl(current)}
                  shortcut={{ modifiers: ["cmd"], key: "o" }}
                />
              </ActionPanel.Section>
              <ActionPanel.Section>
                <Action.Push
                  title="Create Branch"
                  icon={Icon.NewDocument}
                  shortcut={{ modifiers: ["cmd", "shift"], key: "b" }}
                  target={<CreateBranchForm item={current} />}
                />
                <Action.CopyToClipboard
                  title="Copy Branch Name"
                  icon={Icon.CodeBlock}
                  content={getBranchName(current)}
                  shortcut={{ modifiers: ["cmd", "opt"], key: "b" }}
                />
                <Action.CopyToClipboard
                  title="Copy URL"
                  content={getWebUrl(current)}
                  shortcut={{ modifiers: ["cmd", "shift"], key: "," }}
                />
                <Action.CopyToClipboard
                  title="Copy as Markdown Link"
                  content={`[#${current.id} ${current.title}](${getWebUrl(current)})`}
                  shortcut={{ modifiers: ["cmd", "opt"], key: "." }}
                />
              </ActionPanel.Section>
            </ActionPanel>
          }
        />
      </List.Section>

      {childList.length > 0 && (
        <List.Section title="Children" subtitle={String(childList.length)}>
          {childList.map((c) => {
            const cTypeAcc = getTypeAccessory(c.workItemType);
            return (
              <List.Item
                key={c.id}
                icon={{ source: cTypeAcc.icon, tintColor: cTypeAcc.tintColor }}
                title={c.title}
                subtitle={`#${c.id}`}
                keywords={[String(c.id), c.workItemType, ...c.tags]}
                accessories={[
                  { tag: { value: c.state, color: getStateColor(c.state) } },
                ]}
                detail={<WorkItemDetail item={c} withChildren={false} />}
                actions={
                  <ActionPanel>
                    <ActionPanel.Section>
                      <Action.Push
                        title="Open"
                        icon={Icon.ArrowRight}
                        target={
                          <WorkItemView
                            item={c}
                            onUpdated={handleChildUpdated}
                          />
                        }
                      />
                      <Action.Push
                        title="Change State"
                        icon={Icon.Pencil}
                        shortcut={{ modifiers: ["cmd", "shift"], key: "s" }}
                        target={
                          <ChangeStateView
                            item={c}
                            onUpdated={handleChildUpdated}
                          />
                        }
                      />
                      <Action.OpenInBrowser
                        title="Open in Azure Devops"
                        url={getWebUrl(c)}
                        shortcut={{ modifiers: ["cmd"], key: "o" }}
                      />
                    </ActionPanel.Section>
                    <ActionPanel.Section>
                      <Action.Push
                        title="Create Branch"
                        icon={Icon.NewDocument}
                        shortcut={{ modifiers: ["cmd", "shift"], key: "b" }}
                        target={<CreateBranchForm item={c} />}
                      />
                      <Action.CopyToClipboard
                        title="Copy Branch Name"
                        icon={Icon.CodeBlock}
                        content={getBranchName(c)}
                        shortcut={{ modifiers: ["cmd", "opt"], key: "b" }}
                      />
                      <Action.CopyToClipboard
                        title="Copy URL"
                        content={getWebUrl(c)}
                        shortcut={{ modifiers: ["cmd", "shift"], key: "," }}
                      />
                    </ActionPanel.Section>
                  </ActionPanel>
                }
              />
            );
          })}
        </List.Section>
      )}

      {!isLoading && childList.length === 0 && (
        <List.Section title="Children">
          <List.Item icon={Icon.Minus} title="No children" />
        </List.Section>
      )}
    </List>
  );
}

function WorkItemDetail({
  item,
  withChildren = true,
}: {
  item: WorkItem;
  withChildren?: boolean;
}) {
  const { data: children, isLoading: childrenLoading } = useCachedPromise(
    getWorkItemChildren,
    [item.id],
    {
      initialData: [] as WorkItem[],
      keepPreviousData: false,
      execute: withChildren,
    },
  );

  const childrenList = children ?? [];
  const childrenSection = !withChildren
    ? ""
    : childrenLoading
      ? "\n\n## Children\n\n_Loading…_"
      : childrenList.length === 0
        ? ""
        : `\n\n## Children (${childrenList.length})\n\n${childrenList
            .map((c) => {
              const done = ["Closed", "Done", "Removed"].includes(c.state);
              const box = done ? "[x]" : "[ ]";
              return `- ${box} **#${c.id}** [${c.title}](${getWebUrl(c)}) — *${c.workItemType} · ${c.state}*`;
            })
            .join("\n")}`;

  const meta = [
    `**${item.workItemType} #${item.id}**`,
    `· ${item.state}`,
    item.priority ? `· P${item.priority}` : "",
    `· ${item.project}`,
    `· ${formatRelative(item.changedDate)}`,
  ]
    .filter(Boolean)
    .join(" ");

  const tagsLine =
    item.tags.length > 0 ? `\n\n_Tags: ${item.tags.join(", ")}_` : "";

  const md = `
# ${item.title}

${meta}${tagsLine}

---

${item.description ? stripHtml(item.description) : "_No description_"}${childrenSection}
  `.trim();

  return <List.Item.Detail markdown={md} />;
}

function SettingsView({
  availableStates,
  currentHidden,
  onSave,
}: {
  availableStates: string[];
  currentHidden: string[];
  onSave: (next: string[]) => Promise<void>;
}) {
  const [hidden, setHidden] = useState<string[]>(currentHidden);

  const toggle = async (state: string) => {
    const next = hidden.includes(state)
      ? hidden.filter((s) => s !== state)
      : [...hidden, state];
    setHidden(next);
    await onSave(next);
  };

  const visibleCount = availableStates.filter(
    (s) => !hidden.includes(s),
  ).length;

  return (
    <List
      navigationTitle="Settings — Visible States"
      searchBarPlaceholder="Search states…"
    >
      <List.Section
        title="States"
        subtitle={`${visibleCount} of ${availableStates.length} visible`}
      >
        {availableStates.map((state) => {
          const isVisible = !hidden.includes(state);
          return (
            <List.Item
              key={state}
              icon={{
                source: isVisible ? Icon.CheckCircle : Icon.Circle,
                tintColor: isVisible
                  ? getStateColor(state)
                  : Color.SecondaryText,
              }}
              title={state}
              accessories={[
                {
                  tag: {
                    value: isVisible ? "Visible" : "Hidden",
                    color: isVisible ? Color.Green : Color.SecondaryText,
                  },
                },
              ]}
              actions={
                <ActionPanel>
                  <Action
                    title={isVisible ? "Hide" : "Show"}
                    icon={isVisible ? Icon.EyeDisabled : Icon.Eye}
                    onAction={() => toggle(state)}
                  />
                </ActionPanel>
              }
            />
          );
        })}
      </List.Section>
    </List>
  );
}

function CreateBranchForm({ item }: { item: WorkItem }) {
  const { pop } = useNavigation();
  const { data: repos, isLoading } = useCachedPromise(
    getRepositories,
    [item.project],
    {
      initialData: [] as Repository[],
      onError: (err) => {
        showToast({
          style: Toast.Style.Failure,
          title: "Failed to load repositories",
          message: err.message,
        });
      },
    },
  );

  const repoList = repos ?? [];
  const [repoId, setRepoId] = useState<string>("");
  const [branchName, setBranchName] = useState<string>(getBranchName(item));
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!repoId && repoList.length > 0) {
      const preferred =
        repoList.find((r) => r.name === item.project) ?? repoList[0];
      setRepoId(preferred.id);
    }
  }, [repoList, repoId, item.project]);

  const handleSubmit = async () => {
    const repo = repoList.find((r) => r.id === repoId);
    if (!repo) {
      showToast({ style: Toast.Style.Failure, title: "Pick a repository" });
      return;
    }
    const trimmed = branchName.trim();
    if (!trimmed) {
      showToast({ style: Toast.Style.Failure, title: "Branch name required" });
      return;
    }

    setSubmitting(true);
    const toast = await showToast({
      style: Toast.Style.Animated,
      title: `Creating ${trimmed}…`,
    });

    try {
      const { branchName: created, branchUrl } = await createBranchForWorkItem({
        workItemId: item.id,
        project: item.project,
        repo,
        branchName: trimmed,
      });
      await Clipboard.copy(created);
      toast.style = Toast.Style.Success;
      toast.title = `Created ${created}`;
      toast.message = "Copied to clipboard";
      toast.primaryAction = {
        title: "Open Branch",
        onAction: () => open(branchUrl),
      };
      pop();
    } catch (err) {
      toast.style = Toast.Style.Failure;
      toast.title = "Failed to create branch";
      toast.message = err instanceof Error ? err.message : String(err);
    } finally {
      setSubmitting(false);
    }
  };

  const baseLabel =
    repoList
      .find((r) => r.id === repoId)
      ?.defaultBranch.replace(/^refs\/heads\//, "") ?? "default branch";

  return (
    <Form
      isLoading={isLoading || submitting}
      navigationTitle={`#${item.id} — Create Branch`}
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="Create Branch"
            icon={Icon.NewDocument}
            onSubmit={handleSubmit}
          />
        </ActionPanel>
      }
    >
      <Form.Description
        text={`Create a branch from "${baseLabel}" and link it to #${item.id}.`}
      />
      <Form.Dropdown
        id="repo"
        title="Repository"
        value={repoId}
        onChange={setRepoId}
      >
        {repoList.map((r) => (
          <Form.Dropdown.Item key={r.id} value={r.id} title={r.name} />
        ))}
      </Form.Dropdown>
      <Form.TextField
        id="branchName"
        title="Branch Name"
        value={branchName}
        onChange={setBranchName}
      />
    </Form>
  );
}

function ChangeStateView({
  item,
  onUpdated,
}: {
  item: WorkItem;
  onUpdated: (updated: WorkItem) => void;
}) {
  const [currentState, setCurrentState] = useState(item.state);

  const { data: states, isLoading } = useCachedPromise(
    (project: string, type: string) => getWorkItemStates(project, type),
    [item.project, item.workItemType],
    {
      initialData: [],
      onError: (err) => {
        showToast({
          style: Toast.Style.Failure,
          title: "Failed to load states",
          message: err.message,
        });
      },
    },
  );

  const handleChange = async (newState: string) => {
    if (newState === currentState) return;

    if (
      newState === "Closed" ||
      newState === "Removed" ||
      newState === "Done"
    ) {
      const confirmed = await confirmAlert({
        title: `Move #${item.id} to ${newState}?`,
        message: item.title,
        primaryAction: {
          title: newState,
          style: Alert.ActionStyle.Destructive,
        },
      });
      if (!confirmed) return;
    }

    const toast = await showToast({
      style: Toast.Style.Animated,
      title: `Updating to ${newState}…`,
    });

    try {
      const updated = await updateWorkItemState(item.id, newState);
      setCurrentState(updated.state);
      onUpdated(updated);
      toast.style = Toast.Style.Success;
      toast.title = `#${item.id} → ${newState}`;
    } catch (err) {
      toast.style = Toast.Style.Failure;
      toast.title = "Update failed";
      toast.message = err instanceof Error ? err.message : String(err);
    }
  };

  return (
    <List
      isLoading={isLoading}
      navigationTitle={`#${item.id} — Change State`}
      searchBarPlaceholder="Choose new state…"
    >
      {(states ?? []).map((state) => (
        <List.Item
          key={state}
          icon={{
            source: state === currentState ? Icon.CheckCircle : Icon.Circle,
            tintColor: getStateColor(state),
          }}
          title={state}
          subtitle={state === currentState ? "Current" : undefined}
          actions={
            <ActionPanel>
              <Action
                title={`Set to ${state}`}
                icon={Icon.Checkmark}
                onAction={() => handleChange(state)}
              />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}

function stripHtml(html: string): string {
  return html
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .trim();
}
