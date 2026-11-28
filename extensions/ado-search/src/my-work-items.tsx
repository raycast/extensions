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
  useNavigation,
} from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import {
  parseList,
  getMyWorkItems,
  getWorkItemStates,
  getWorkItemTypes,
  getAllStatesForProject,
  updateWorkItemState,
  getWebUrl,
  getAllRepositories,
  getBranches,
  getProjects,
  Repository,
  WorkItem,
  WorkItemTypeInfo,
} from "./lib/azure-devops";
import { AppSettings, EMPTY_SETTINGS, readAppSettings, writeAppSettings } from "./lib/app-settings";
import { WorkItemExtraActions } from "./components/sprint/ExtraActions";
import { CreateWorkItemForm } from "./components/create-work-item-form";
import {
  ChangeStateView,
  CreateBranchForm,
  WorkItemDetail,
  WorkItemView,
  formatRelative,
  getBranchName,
  getStateColor,
  getTypeAccessory,
} from "./components/work-item-view";
import { useEffect, useState } from "react";

function normalizeState(s: string): string {
  return s.toLowerCase().replace(/\s+/g, "");
}
function stateOrderIndex(state: string, order: string[]): number {
  const idx = order.indexOf(normalizeState(state));
  return idx === -1 ? order.length : idx;
}

export default function Command() {
  const [filter, setFilter] = useState<string>("all");
  const [showDetail, setShowDetail] = useState<boolean>(false);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());

  const [settings, setSettings] = useState<AppSettings>(EMPTY_SETTINGS);
  const [onboarded, setOnboarded] = useState<boolean | null>(null);

  useEffect(() => {
    let cancelled = false;
    readAppSettings().then((result) => {
      if (cancelled) return;
      setSettings(result.settings);
      setOnboarded(result.onboarded);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const handleSettingsSaved = (next: AppSettings) => {
    setSettings(next);
    setOnboarded(true);
  };

  const appProject = settings.project;
  const appStates = settings.states;
  const appTypes = settings.types;
  const appStateOrder = settings.stateOrder;
  const appAssignedToMe = settings.assignedToMe;

  const { data, isLoading, revalidate, mutate } = useCachedPromise(
    async (projectArg: string, statesArg: string, typesArg: string, assignedToMeArg: boolean) =>
      getMyWorkItems({
        project: projectArg || undefined,
        states: statesArg ? statesArg.split("|") : undefined,
        types: typesArg ? typesArg.split("|") : undefined,
        assignedToMe: assignedToMeArg,
      }),
    [appProject, appStates.join("|"), appTypes.join("|"), appAssignedToMe],
    {
      initialData: [],
      keepPreviousData: true,
      execute: onboarded === true,
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

  const projects = Array.from(new Set(items.map((i) => i.project))).sort();
  const types = Array.from(new Set(items.map((i) => i.workItemType))).sort();

  const filtered = items.filter((item) => {
    if (filter === "all") return true;
    if (filter.startsWith("type:")) return item.workItemType === filter.slice(5);
    if (filter.startsWith("project:")) return item.project === filter.slice(8);
    return true;
  });

  const groups = new Map<string, WorkItem[]>();
  for (const item of filtered) {
    const list = groups.get(item.state) ?? [];
    list.push(item);
    groups.set(item.state, list);
  }
  // Section order: user's "Preferred state order" first (in that order), then
  // any remaining selected states (TagPicker order), then everything else
  // alphabetically (handled by stateOrderIndex returning the array length).
  const preferredOrder = parseList(appStateOrder).map(normalizeState);
  const stateOrder = [
    ...preferredOrder,
    ...(appStates ?? []).map(normalizeState).filter((s) => !preferredOrder.includes(s)),
  ];
  const groupKeys = Array.from(groups.keys()).sort((a, b) => {
    const ai = stateOrderIndex(a, stateOrder);
    const bi = stateOrderIndex(b, stateOrder);
    return ai !== bi ? ai - bi : a.localeCompare(b);
  });

  const onItemUpdated = (updated: WorkItem) => {
    mutate(Promise.resolve(items.map((i) => (i.id === updated.id ? updated : i))), {
      optimisticUpdate: () => items.map((i) => (i.id === updated.id ? updated : i)),
    });
  };

  const onBulkUpdated = (updates: WorkItem[]) => {
    const byId = new Map(updates.map((u) => [u.id, u]));
    mutate(Promise.resolve(items.map((i) => byId.get(i.id) ?? i)), {
      optimisticUpdate: () => items.map((i) => byId.get(i.id) ?? i),
    });
  };

  const toggleSelection = (id: number) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const selectAllVisible = () => {
    setSelectedIds(new Set(filtered.map((i) => i.id)));
  };

  const clearSelection = () => setSelectedIds(new Set());

  const selectedItems = items.filter((i) => selectedIds.has(i.id));

  if (onboarded === null) {
    return <List isLoading />;
  }

  if (!onboarded) {
    return (
      <SetupView
        firstRun
        onSaved={(next) => {
          handleSettingsSaved(next);
          revalidate();
        }}
      />
    );
  }

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
                <List.Dropdown.Item key={`type:${t}`} title={t} value={`type:${t}`} />
              ))}
            </List.Dropdown.Section>
          )}
          {projects.length > 1 && (
            <List.Dropdown.Section title="Project">
              {projects.map((p) => (
                <List.Dropdown.Item key={`project:${p}`} title={p} value={`project:${p}`} />
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
          actions={
            <ActionPanel>
              <Action.Push
                title="New Work Item"
                icon={Icon.Plus}
                shortcut={{ modifiers: ["cmd"], key: "n" }}
                target={<CreateWorkItemForm knownProjects={projects} onCreated={() => revalidate()} />}
              />
              <Action.Push
                title="Settings"
                icon={Icon.Gear}
                shortcut={{ modifiers: ["cmd", "opt"], key: "," }}
                target={
                  <SetupView
                    onSaved={(next) => {
                      handleSettingsSaved(next);
                      revalidate();
                    }}
                  />
                }
              />
            </ActionPanel>
          }
        />
      )}

      {groupKeys.map((key) => {
        const groupItems = groups.get(key)!;
        const groupSelected = groupItems.filter((i) => selectedIds.has(i.id)).length;
        return (
          <List.Section
            key={key}
            title={key}
            subtitle={
              groupSelected > 0 ? `${groupItems.length} · ${groupSelected} selected` : String(groupItems.length)
            }
          >
            {groupItems.map((item) => (
              <WorkItemRow
                key={item.id}
                item={item}
                showAssignee={!appAssignedToMe}
                onChange={() => revalidate()}
                onItemUpdated={onItemUpdated}
                showDetail={showDetail}
                onToggleDetail={() => setShowDetail((v) => !v)}
                knownProjects={projects}
                isSelected={selectedIds.has(item.id)}
                onToggleSelect={() => toggleSelection(item.id)}
                selectedItems={selectedItems}
                onBulkUpdated={onBulkUpdated}
                onSelectAllVisible={selectAllVisible}
                onClearSelection={clearSelection}
                onSettingsSaved={(next) => {
                  handleSettingsSaved(next);
                  revalidate();
                }}
              />
            ))}
          </List.Section>
        );
      })}
    </List>
  );
}

function WorkItemRow({
  item,
  onChange,
  onItemUpdated,
  showDetail,
  onToggleDetail,
  knownProjects,
  isSelected,
  onToggleSelect,
  selectedItems,
  onBulkUpdated,
  onSelectAllVisible,
  onClearSelection,
  onSettingsSaved,
  showAssignee,
}: {
  item: WorkItem;
  onChange: () => void;
  onItemUpdated: (updated: WorkItem) => void;
  showDetail: boolean;
  onToggleDetail: () => void;
  knownProjects: string[];
  isSelected: boolean;
  onToggleSelect: () => void;
  selectedItems: WorkItem[];
  onBulkUpdated: (updates: WorkItem[]) => void;
  onSelectAllVisible: () => void;
  onClearSelection: () => void;
  onSettingsSaved: (s: AppSettings) => void;
  showAssignee: boolean;
}) {
  const typeAcc = getTypeAccessory(item.workItemType);
  const selectedCount = selectedItems.length;

  return (
    <List.Item
      icon={{ source: typeAcc.icon, tintColor: typeAcc.tintColor }}
      title={item.title}
      subtitle={`#${item.id}`}
      keywords={[String(item.id), item.workItemType, ...item.tags, item.project]}
      accessories={[
        ...(isSelected
          ? [
              {
                icon: { source: Icon.CheckCircle, tintColor: Color.Green },
                tooltip: "Selected",
              },
            ]
          : []),
        ...(item.priority ? [{ text: `P${item.priority}` }] : []),
        ...(showAssignee && item.assignedTo
          ? [{ icon: Icon.Person, text: item.assignedTo, tooltip: `Assigned to ${item.assignedTo}` }]
          : []),
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
          <ActionPanel.Section title="Selection">
            <Action
              title={isSelected ? "Deselect" : "Select"}
              icon={isSelected ? Icon.Circle : Icon.CheckCircle}
              shortcut={{ modifiers: ["cmd"], key: "t" }}
              onAction={onToggleSelect}
            />
            {selectedCount > 0 && (
              <Action.Push
                title={`Change State for ${selectedCount} Selected`}
                icon={Icon.Pencil}
                shortcut={{ modifiers: ["cmd", "opt"], key: "s" }}
                target={
                  <BulkChangeStateView
                    items={selectedItems}
                    onCompleted={(updates) => {
                      onBulkUpdated(updates);
                      onClearSelection();
                    }}
                  />
                }
              />
            )}
            <Action
              title="Select All Visible"
              icon={Icon.CheckCircle}
              shortcut={{ modifiers: ["cmd", "opt"], key: "a" }}
              onAction={onSelectAllVisible}
            />
            {selectedCount > 0 && (
              <Action
                title="Clear Selection"
                icon={Icon.Circle}
                shortcut={{ modifiers: ["cmd", "shift"], key: "a" }}
                onAction={onClearSelection}
              />
            )}
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
              // ⌘. is Raycast's Pin shortcut.
              shortcut={{
                macOS: { modifiers: ["cmd", "shift"], key: "n" },
                Windows: { modifiers: ["ctrl", "shift"], key: "n" },
              }}
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
            <Action.Push
              title="New Work Item"
              icon={Icon.Plus}
              shortcut={{ modifiers: ["cmd"], key: "n" }}
              target={<CreateWorkItemForm knownProjects={knownProjects} onCreated={onChange} />}
            />
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
              target={<SetupView onSaved={onSettingsSaved} />}
            />
          </ActionPanel.Section>
          <WorkItemExtraActions item={item} onDone={onChange} />
        </ActionPanel>
      }
    />
  );
}

function SetupView({ firstRun = false, onSaved }: { firstRun?: boolean; onSaved?: (settings: AppSettings) => void }) {
  const { pop } = useNavigation();

  const [project, setProject] = useState("");
  const [states, setStates] = useState<string[]>([]);
  const [stateOrder, setStateOrder] = useState("");
  const [types, setTypes] = useState<string[]>([]);
  const [defaultRepo, setDefaultRepo] = useState("");
  const [defaultBaseBranch, setDefaultBaseBranch] = useState("");
  const [assignedToMe, setAssignedToMe] = useState(true);
  const [formInitialized, setFormInitialized] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    let cancelled = false;
    readAppSettings().then(({ settings }) => {
      if (cancelled) return;
      setProject(settings.project);
      setStates(settings.states);
      setStateOrder(settings.stateOrder);
      setTypes(settings.types);
      setDefaultRepo(settings.defaultRepo);
      setDefaultBaseBranch(settings.defaultBaseBranch);
      setAssignedToMe(settings.assignedToMe);
      setFormInitialized(true);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const { data: fetchedProjects, isLoading: loadingProjects } = useCachedPromise(getProjects, [], { initialData: [] });
  const projectNames = (fetchedProjects ?? []).map((p) => p.name).sort();

  const { data: projectStates, isLoading: loadingStates } = useCachedPromise(
    async (p: string): Promise<string[]> => (p ? getAllStatesForProject(p) : []),
    [project],
    { initialData: [] as string[], keepPreviousData: false },
  );
  const stateOptions: string[] = projectStates ?? [];

  const { data: projectTypes, isLoading: loadingTypes } = useCachedPromise(
    async (p: string): Promise<WorkItemTypeInfo[]> => (p ? getWorkItemTypes(p) : []),
    [project],
    {
      initialData: [] as WorkItemTypeInfo[],
      keepPreviousData: false,
    },
  );
  const typeOptions: string[] = (projectTypes ?? []).map((t) => t.name);

  const { data: allRepos, isLoading: loadingRepos } = useCachedPromise(getAllRepositories, [], {
    initialData: [] as Repository[],
  });
  const repoList = allRepos ?? [];

  const selectedRepo = repoList.find((r) => r.name.toLowerCase() === defaultRepo.toLowerCase());
  const { data: branches, isLoading: loadingBranches } = useCachedPromise(
    async (repoProject: string, repoId: string) => {
      if (!repoProject || !repoId) return [];
      return getBranches(repoProject, repoId);
    },
    [selectedRepo?.projectName ?? "", selectedRepo?.id ?? ""],
    { initialData: [] as string[], keepPreviousData: false },
  );
  const branchList = branches ?? [];

  const handleSubmit = async () => {
    // Mirror the query-layer guard in buildWorkItemsWiql: browsing everyone's
    // items needs a bounding filter, otherwise the next query would throw and
    // leave the list empty/stale despite a "saved" toast.
    if (!assignedToMe && !project.trim() && states.length === 0 && types.length === 0) {
      showToast({
        style: Toast.Style.Failure,
        title: "Add a bounding filter",
        message: "To show items not assigned to you, pick a project, state, or type first.",
      });
      return;
    }
    setSubmitting(true);
    const next: AppSettings = {
      project: project.trim(),
      states,
      types,
      stateOrder: stateOrder.trim(),
      defaultRepo: defaultRepo.trim(),
      defaultBaseBranch: defaultBaseBranch.trim(),
      assignedToMe,
    };
    try {
      await writeAppSettings(next);
      onSaved?.(next);
      showToast({
        style: Toast.Style.Success,
        title: firstRun ? "Welcome — you're set up" : "Settings saved",
      });
      if (!firstRun) pop();
    } catch (err) {
      showToast({
        style: Toast.Style.Failure,
        title: "Failed to save",
        message: err instanceof Error ? err.message : String(err),
      });
    } finally {
      setSubmitting(false);
    }
  };

  const projectIsEmpty = !project && projectNames.length > 0;
  const safeStates = states.filter((s) => stateOptions.includes(s));
  const safeTypes = types.filter((t) => typeOptions.includes(t));

  const projectInList = !project || projectNames.includes(project);
  const repoInList = !defaultRepo || repoList.some((r) => r.name === defaultRepo);
  const baseBranchInList = !defaultBaseBranch || branchList.includes(defaultBaseBranch);

  // Ignore onChange before the saved values have loaded (prevents the initial
  // mount from clobbering them). We no longer bail while option lists are still
  // loading — that silently dropped the user's selections, so saving persisted
  // the defaults. Dropdowns stay safe because they render the current value as a
  // fallback item; the TagPickers have no fallback, so they additionally ignore
  // the empty onChange emitted while their options are still loading.
  const handleProjectChange = (next: string) => {
    if (!formInitialized) return;
    setProject(next);
  };
  const handleStatesChange = (next: string[]) => {
    if (!formInitialized || stateOptions.length === 0) return;
    setStates(next);
  };
  const handleTypesChange = (next: string[]) => {
    if (!formInitialized || typeOptions.length === 0) return;
    setTypes(next);
  };
  const handleRepoChange = (next: string) => {
    if (!formInitialized) return;
    setDefaultRepo(next);
  };
  const handleBaseBranchChange = (next: string) => {
    if (!formInitialized) return;
    setDefaultBaseBranch(next);
  };

  return (
    <Form
      isLoading={
        !formInitialized ||
        loadingProjects ||
        loadingStates ||
        loadingTypes ||
        loadingRepos ||
        loadingBranches ||
        submitting
      }
      navigationTitle={firstRun ? "Welcome — Set Up" : "Settings"}
      actions={
        <ActionPanel>
          <Action.SubmitForm title={firstRun ? "Get Started" : "Save"} icon={Icon.Check} onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      {firstRun && (
        <Form.Description
          title="Welcome"
          text="Pick what you want to see and where new branches should go. You can change this any time with ⌘⌥, from the work items list."
        />
      )}
      <Form.Dropdown
        id="project"
        title="Default Project"
        info="Limit the list to a single project. Leave empty to see items from all projects."
        value={project}
        onChange={handleProjectChange}
      >
        <Form.Dropdown.Item value="" title="All projects" />
        {!projectInList && <Form.Dropdown.Item value={project} title={project} />}
        {projectNames.map((p) => (
          <Form.Dropdown.Item key={p} value={p} title={p} />
        ))}
      </Form.Dropdown>
      <Form.Checkbox
        id="assignedToMe"
        title="Assignment"
        label="Only show items assigned to me"
        info="When on, the list is scoped to items assigned to you. Turn off to see everyone's items — a project, state, or type filter is required to keep the result set bounded."
        value={assignedToMe}
        onChange={setAssignedToMe}
      />
      <Form.TagPicker
        id="states"
        title="States to Show"
        info={
          projectIsEmpty
            ? "Pick a project first to see its states."
            : "Select which work item states appear in the list. Empty = all except Closed, Done, Removed. Use “Preferred State Order” below to control the order of the grouped sections."
        }
        value={safeStates}
        onChange={handleStatesChange}
      >
        {stateOptions.map((s) => (
          <Form.TagPicker.Item key={s} value={s} title={s} />
        ))}
      </Form.TagPicker>
      <Form.TextField
        id="stateOrder"
        title="Preferred State Order"
        placeholder="Doing, In Progress, Code Review"
        info="Comma-separated states to pin to the top of the list, in this order (e.g. 'Doing, In Progress'). Matching is case-insensitive. States not listed here follow afterwards. Leave empty for the default order."
        value={stateOrder}
        onChange={setStateOrder}
      />
      <Form.TagPicker
        id="types"
        title="Types to Show"
        info={
          projectIsEmpty
            ? "Pick a project first to see its work item types."
            : "Select which work item types appear. Empty = all visible types."
        }
        value={safeTypes}
        onChange={handleTypesChange}
      >
        {typeOptions.map((t) => (
          <Form.TagPicker.Item key={t} value={t} title={t} />
        ))}
      </Form.TagPicker>
      <Form.Separator />
      <Form.Dropdown
        id="defaultRepo"
        title="Default Repository"
        info="Pre-selected when creating a new branch. Looked up across all your projects."
        value={defaultRepo}
        onChange={handleRepoChange}
      >
        <Form.Dropdown.Item value="" title="—" />
        {!repoInList && <Form.Dropdown.Item value={defaultRepo} title={defaultRepo} />}
        {repoList.map((r) => (
          <Form.Dropdown.Item key={r.id} value={r.name} title={`${r.name}  ·  ${r.projectName}`} />
        ))}
      </Form.Dropdown>
      <Form.Dropdown
        id="defaultBaseBranch"
        title="Default Base Branch"
        info="Branch new branches are created from. Empty = repo's default branch."
        value={defaultBaseBranch}
        onChange={handleBaseBranchChange}
      >
        <Form.Dropdown.Item value="" title="—" />
        {!baseBranchInList && <Form.Dropdown.Item value={defaultBaseBranch} title={defaultBaseBranch} />}
        {branchList.map((b) => (
          <Form.Dropdown.Item key={b} value={b} title={b} />
        ))}
      </Form.Dropdown>
    </Form>
  );
}

function BulkChangeStateView({
  items,
  onCompleted,
}: {
  items: WorkItem[];
  onCompleted: (updates: WorkItem[]) => void;
}) {
  const { pop } = useNavigation();

  const uniquePT = Array.from(
    new Map(items.map((i) => [`${i.project}|${i.workItemType}`, [i.project, i.workItemType] as const])).values(),
  );
  const stateKey = uniquePT
    .map(([p, t]) => `${p}|${t}`)
    .sort()
    .join("||");

  const { data: states, isLoading } = useCachedPromise(
    async (key: string) => {
      void key;
      const sets = await Promise.all(uniquePT.map(([p, t]) => getWorkItemStates(p, t).catch(() => [])));
      const flat = sets.flat();
      const seen = new Set<string>();
      const ordered: string[] = [];
      for (const s of flat) {
        if (!seen.has(s)) {
          seen.add(s);
          ordered.push(s);
        }
      }
      return ordered;
    },
    [stateKey],
    { initialData: [] as string[] },
  );

  const handleChange = async (newState: string) => {
    if (newState === "Closed" || newState === "Removed" || newState === "Done") {
      const confirmed = await confirmAlert({
        title: `Move ${items.length} items to ${newState}?`,
        message: items.map((i) => `#${i.id} ${i.title}`).join("\n"),
        primaryAction: {
          title: newState,
          style: Alert.ActionStyle.Destructive,
        },
      });
      if (!confirmed) return;
    }

    const toast = await showToast({
      style: Toast.Style.Animated,
      title: `Updating 0 / ${items.length}…`,
    });

    const updates: WorkItem[] = [];
    const failures: { id: number; error: string }[] = [];
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      toast.title = `Updating ${i + 1} / ${items.length}…`;
      toast.message = `#${item.id}`;
      try {
        const updated = await updateWorkItemState(item.id, newState);
        updates.push(updated);
      } catch (err) {
        failures.push({
          id: item.id,
          error: err instanceof Error ? err.message : String(err),
        });
      }
    }

    if (updates.length > 0) onCompleted(updates);

    if (failures.length === 0) {
      toast.style = Toast.Style.Success;
      toast.title = `Updated ${updates.length} items → ${newState}`;
      toast.message = undefined;
    } else {
      toast.style = Toast.Style.Failure;
      toast.title = `${updates.length} updated, ${failures.length} failed`;
      toast.message = failures.map((f) => `#${f.id}: ${f.error}`).join("\n");
    }
    pop();
  };

  return (
    <List
      isLoading={isLoading}
      navigationTitle={`Change State — ${items.length} items`}
      searchBarPlaceholder="Choose new state…"
    >
      <List.Section title="Selected" subtitle={String(items.length)}>
        {items.map((i) => {
          const acc = getTypeAccessory(i.workItemType);
          return (
            <List.Item
              key={i.id}
              icon={{ source: acc.icon, tintColor: acc.tintColor }}
              title={i.title}
              subtitle={`#${i.id}`}
              accessories={[{ tag: { value: i.state, color: getStateColor(i.state) } }]}
            />
          );
        })}
      </List.Section>
      <List.Section title="Apply New State">
        {(states ?? []).map((state) => (
          <List.Item
            key={state}
            icon={{
              source: Icon.ArrowRight,
              tintColor: getStateColor(state),
            }}
            title={state}
            actions={
              <ActionPanel>
                <Action title={`Set to ${state}`} icon={Icon.Checkmark} onAction={() => handleChange(state)} />
              </ActionPanel>
            }
          />
        ))}
      </List.Section>
    </List>
  );
}
