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
  LocalStorage,
  useNavigation,
  open,
  getPreferenceValues,
} from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import {
  getMyWorkItems,
  getWorkItemStates,
  getWorkItemTypes,
  getAllStatesForProject,
  getWorkItemChildren,
  getWorkItemAttachments,
  getWorkItemComments,
  updateWorkItemState,
  getWebUrl,
  getAllRepositories,
  getBranches,
  createBranchForWorkItem,
  createWorkItem,
  getProjects,
  Repository,
  WorkItem,
  WorkItemTypeInfo,
} from "./lib/azure-devops";
import {
  processDescription,
  fetchAttachmentByName,
  isImageFilename,
  toMarkdownFileUrl,
  ProcessedDescription,
  ProcessedImage,
} from "./lib/attachments";
import { useEffect, useState } from "react";
import path from "path";
import crypto from "crypto";

function useProcessedDescription(description: string | undefined): ProcessedDescription | null {
  const [media, setMedia] = useState<ProcessedDescription | null>(null);
  useEffect(() => {
    let cancelled = false;
    setMedia(null);
    processDescription(description).then((m) => {
      if (!cancelled) setMedia(m);
    });
    return () => {
      cancelled = true;
    };
  }, [description]);
  return media;
}

function useProcessedHtmlList(htmls: (string | undefined)[], key: string): ProcessedDescription | null {
  const [media, setMedia] = useState<ProcessedDescription | null>(null);
  useEffect(() => {
    let cancelled = false;
    setMedia(null);
    const combined = htmls.filter(Boolean).join("\n\n");
    processDescription(combined).then((m) => {
      if (!cancelled) setMedia(m);
    });
    return () => {
      cancelled = true;
    };
  }, [key]);
  return media;
}

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
  return TYPE_ICONS[type] ?? { icon: Icon.Document, tintColor: Color.PrimaryText };
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

function normalizeState(s: string): string {
  return s.toLowerCase().replace(/\s+/g, "");
}
function stateOrderIndex(state: string, order: string[]): number {
  const idx = order.indexOf(normalizeState(state));
  return idx === -1 ? order.length : idx;
}

interface AppSettings {
  project: string;
  states: string[];
  types: string[];
  defaultRepo: string;
  defaultBaseBranch: string;
}

const EMPTY_SETTINGS: AppSettings = {
  project: "",
  states: [],
  types: [],
  defaultRepo: "",
  defaultBaseBranch: "",
};

const STORAGE_KEYS = {
  project: "app.project",
  states: "app.states",
  types: "app.types",
  defaultRepo: "app.defaultRepo",
  defaultBaseBranch: "app.defaultBaseBranch",
  onboarded: "app.onboarded",
};

async function readAppSettings(): Promise<{
  settings: AppSettings;
  onboarded: boolean;
}> {
  const [p, s, t, r, b, o] = await Promise.all([
    LocalStorage.getItem<string>(STORAGE_KEYS.project),
    LocalStorage.getItem<string>(STORAGE_KEYS.states),
    LocalStorage.getItem<string>(STORAGE_KEYS.types),
    LocalStorage.getItem<string>(STORAGE_KEYS.defaultRepo),
    LocalStorage.getItem<string>(STORAGE_KEYS.defaultBaseBranch),
    LocalStorage.getItem<string>(STORAGE_KEYS.onboarded),
  ]);
  const tryParse = <T,>(v: string | undefined, fallback: T): T => {
    if (typeof v !== "string") return fallback;
    try {
      return JSON.parse(v) as T;
    } catch {
      return fallback;
    }
  };
  return {
    settings: {
      project: tryParse<string>(p, ""),
      states: tryParse<string[]>(s, []),
      types: tryParse<string[]>(t, []),
      defaultRepo: tryParse<string>(r, ""),
      defaultBaseBranch: tryParse<string>(b, ""),
    },
    onboarded: tryParse<boolean>(o, false),
  };
}

async function writeAppSettings(settings: AppSettings): Promise<void> {
  await Promise.all([
    LocalStorage.setItem(STORAGE_KEYS.project, JSON.stringify(settings.project)),
    LocalStorage.setItem(STORAGE_KEYS.states, JSON.stringify(settings.states)),
    LocalStorage.setItem(STORAGE_KEYS.types, JSON.stringify(settings.types)),
    LocalStorage.setItem(STORAGE_KEYS.defaultRepo, JSON.stringify(settings.defaultRepo)),
    LocalStorage.setItem(STORAGE_KEYS.defaultBaseBranch, JSON.stringify(settings.defaultBaseBranch)),
    LocalStorage.setItem(STORAGE_KEYS.onboarded, JSON.stringify(true)),
  ]);
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

  const { data, isLoading, revalidate, mutate } = useCachedPromise(
    async (projectArg: string, statesArg: string, typesArg: string) =>
      getMyWorkItems({
        project: projectArg || undefined,
        states: statesArg ? statesArg.split("|") : undefined,
        types: typesArg ? typesArg.split("|") : undefined,
      }),
    [appProject, appStates.join("|"), appTypes.join("|")],
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
  const stateOrder = (appStates ?? []).map(normalizeState);
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
        </ActionPanel>
      }
    />
  );
}

function WorkItemView({ item, onUpdated }: { item: WorkItem; onUpdated?: (updated: WorkItem) => void }) {
  const [current, setCurrent] = useState<WorkItem>(item);

  const { data: comments } = useCachedPromise(getWorkItemComments, [current.project, current.id], {
    initialData: [] as string[],
    keepPreviousData: false,
  });

  const richHtmls = [current.description, current.acceptanceCriteria, current.reproSteps, ...(comments ?? [])];
  const richKey = `${current.id}|${crypto.createHash("sha1").update(richHtmls.filter(Boolean).join(" ")).digest("hex")}`;
  const media = useProcessedHtmlList(richHtmls, richKey);

  const {
    data: children,
    isLoading,
    mutate: mutateChildren,
  } = useCachedPromise(getWorkItemChildren, [current.id], {
    initialData: [] as WorkItem[],
    keepPreviousData: false,
  });

  const { data: rawAttachments, isLoading: loadingAttachments } = useCachedPromise(
    getWorkItemAttachments,
    [current.id],
    {
      initialData: [],
      keepPreviousData: false,
      onError: (err) => {
        showToast({
          style: Toast.Style.Failure,
          title: "Failed to load attachments",
          message: err.message,
        });
      },
    },
  );

  const [fileAttachments, setFileAttachments] = useState<ProcessedImage[]>([]);
  const [loadingFiles, setLoadingFiles] = useState(false);
  const rawAttachmentsKey = (rawAttachments ?? []).map((a) => a.url).join("|");
  useEffect(() => {
    let cancelled = false;
    const list = rawAttachments ?? [];
    if (list.length === 0) {
      setFileAttachments((prev) => (prev.length === 0 ? prev : []));
      setLoadingFiles(false);
      return;
    }
    setLoadingFiles(true);
    Promise.all(
      list.map(async (a) => {
        try {
          return await fetchAttachmentByName(a.url, a.name);
        } catch {
          return null;
        }
      }),
    ).then((results) => {
      if (cancelled) return;
      const ok = results.filter((r): r is ProcessedImage => r !== null);
      setFileAttachments(ok);
      setLoadingFiles(false);
    });
    return () => {
      cancelled = true;
    };
  }, [rawAttachmentsKey]);

  const childList = children ?? [];
  const typeAcc = getTypeAccessory(current.workItemType);

  const inlineImages = media?.images ?? [];
  const inlineUrls = new Set(inlineImages.map((i) => i.originalUrl));
  const extraAttachments = fileAttachments.filter((a) => !inlineUrls.has(a.originalUrl));
  const images = [...inlineImages, ...extraAttachments];
  const attachmentsLoading = loadingAttachments || loadingFiles;

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
          detail={<WorkItemDetail item={current} withChildren={false} media={media} />}
          actions={
            <ActionPanel>
              <ActionPanel.Section>
                <Action.Push
                  title="Change State"
                  icon={Icon.Pencil}
                  shortcut={{ modifiers: ["cmd", "shift"], key: "s" }}
                  target={<ChangeStateView item={current} onUpdated={handleSelfUpdated} />}
                />
                <Action.OpenInBrowser
                  title="Open in Azure Devops"
                  url={getWebUrl(current)}
                  shortcut={{ modifiers: ["cmd"], key: "o" }}
                />
                {images.length > 0 && (
                  <Action
                    title="Open First Attachment"
                    icon={Icon.Image}
                    shortcut={{ modifiers: ["cmd", "shift"], key: "i" }}
                    onAction={() => open(images[0].localPath)}
                  />
                )}
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
                  title="Copy Title"
                  content={current.title}
                  shortcut={{ modifiers: ["cmd", "shift"], key: "." }}
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

      <List.Section title="Attachments" subtitle={attachmentsLoading ? "loading…" : String(images.length)}>
        {images.length === 0 && !attachmentsLoading && (
          <List.Item
            icon={Icon.Minus}
            title="No attachments"
            subtitle="No images in description, acceptance criteria, repro steps, comments, or attached files"
          />
        )}
        {images.length === 0 && attachmentsLoading && (
          <List.Item icon={Icon.CircleProgress} title="Loading attachments…" />
        )}
        {images.map((img, i) => {
          const isImg = isImageFilename(img.filename || img.localPath);
          const ext = path.extname(img.localPath).slice(1).toUpperCase();
          const detailMarkdown = isImg
            ? `![${img.alt || img.filename}](${toMarkdownFileUrl(img.localPath)})`
            : `### ${img.filename}\n\nNot an image — open in default app to view.`;
          return (
            <List.Item
              key={img.localPath}
              icon={{
                source: isImg ? Icon.Image : Icon.Document,
                tintColor: isImg ? Color.Blue : Color.SecondaryText,
              }}
              title={img.filename || `Attachment ${i + 1}`}
              subtitle={img.alt && img.alt !== img.filename ? img.alt : undefined}
              accessories={[{ text: ext }]}
              detail={<List.Item.Detail markdown={detailMarkdown} />}
              actions={
                <ActionPanel>
                  <Action title="Open" icon={Icon.Eye} onAction={() => open(img.localPath)} />
                  {img.originalUrl.startsWith("http") && (
                    <Action.OpenInBrowser
                      title="Open Source URL"
                      url={img.originalUrl}
                      shortcut={{ modifiers: ["cmd"], key: "o" }}
                    />
                  )}
                  <Action.ShowInFinder
                    title="Show in Finder"
                    path={img.localPath}
                    shortcut={{ modifiers: ["cmd", "shift"], key: "f" }}
                  />
                  <Action.CopyToClipboard title="Copy File Path" content={img.localPath} />
                </ActionPanel>
              }
            />
          );
        })}
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
                accessories={[{ tag: { value: c.state, color: getStateColor(c.state) } }]}
                detail={<WorkItemDetail item={c} withChildren={false} />}
                actions={
                  <ActionPanel>
                    <ActionPanel.Section>
                      <Action.Push
                        title="Open"
                        icon={Icon.ArrowRight}
                        target={<WorkItemView item={c} onUpdated={handleChildUpdated} />}
                      />
                      <Action.Push
                        title="Change State"
                        icon={Icon.Pencil}
                        shortcut={{ modifiers: ["cmd", "shift"], key: "s" }}
                        target={<ChangeStateView item={c} onUpdated={handleChildUpdated} />}
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
                        title="Copy Title"
                        content={c.title}
                        shortcut={{ modifiers: ["cmd", "shift"], key: "." }}
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
  media: providedMedia,
}: {
  item: WorkItem;
  withChildren?: boolean;
  media?: ProcessedDescription | null;
}) {
  const ownMedia = useProcessedDescription(providedMedia === undefined ? item.description : undefined);
  const media = providedMedia ?? ownMedia;

  const { data: children, isLoading: childrenLoading } = useCachedPromise(getWorkItemChildren, [item.id], {
    initialData: [] as WorkItem[],
    keepPreviousData: false,
    execute: withChildren,
  });

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

  const tagsLine = item.tags.length > 0 ? `\n\n_Tags: ${item.tags.join(", ")}_` : "";

  const descriptionMd = media?.markdown ?? (item.description ? stripHtml(item.description) : "_No description_");

  const md = `
# ${item.title}

${meta}${tagsLine}

---

${descriptionMd}${childrenSection}
  `.trim();

  return <List.Item.Detail markdown={md} />;
}

function SetupView({ firstRun = false, onSaved }: { firstRun?: boolean; onSaved?: (settings: AppSettings) => void }) {
  const { pop } = useNavigation();

  const [project, setProject] = useState("");
  const [states, setStates] = useState<string[]>([]);
  const [types, setTypes] = useState<string[]>([]);
  const [defaultRepo, setDefaultRepo] = useState("");
  const [defaultBaseBranch, setDefaultBaseBranch] = useState("");
  const [formInitialized, setFormInitialized] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    let cancelled = false;
    readAppSettings().then(({ settings }) => {
      if (cancelled) return;
      setProject(settings.project);
      setStates(settings.states);
      setTypes(settings.types);
      setDefaultRepo(settings.defaultRepo);
      setDefaultBaseBranch(settings.defaultBaseBranch);
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
    setSubmitting(true);
    const next: AppSettings = {
      project: project.trim(),
      states,
      types,
      defaultRepo: defaultRepo.trim(),
      defaultBaseBranch: defaultBaseBranch.trim(),
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

  const handleProjectChange = (next: string) => {
    if (!formInitialized || loadingProjects) return;
    setProject(next);
  };
  const handleStatesChange = (next: string[]) => {
    if (!formInitialized || loadingStates || stateOptions.length === 0) return;
    setStates(next);
  };
  const handleTypesChange = (next: string[]) => {
    if (!formInitialized || loadingTypes || typeOptions.length === 0) return;
    setTypes(next);
  };
  const handleRepoChange = (next: string) => {
    if (!formInitialized || loadingRepos) return;
    setDefaultRepo(next);
  };
  const handleBaseBranchChange = (next: string) => {
    if (!formInitialized || loadingBranches) return;
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
      <Form.TagPicker
        id="states"
        title="States to Show"
        info={
          projectIsEmpty
            ? "Pick a project first to see its states."
            : "Select which work item states appear in the list. Empty = all except Closed, Done, Removed. Selection order also determines the order of grouped sections in the list."
        }
        value={safeStates}
        onChange={handleStatesChange}
      >
        {stateOptions.map((s) => (
          <Form.TagPicker.Item key={s} value={s} title={s} />
        ))}
      </Form.TagPicker>
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

function CreateBranchForm({ item }: { item: WorkItem }) {
  const { pop } = useNavigation();
  const { data: repos, isLoading } = useCachedPromise(getAllRepositories, [], {
    initialData: [] as Repository[],
    onError: (err) => {
      showToast({
        style: Toast.Style.Failure,
        title: "Failed to load repositories",
        message: err.message,
      });
    },
  });

  const repoList = repos ?? [];
  const [repoId, setRepoId] = useState<string>("");
  const [branchName, setBranchName] = useState<string>(getBranchName(item));
  const [baseBranch, setBaseBranch] = useState<string>("");
  const [submitting, setSubmitting] = useState(false);
  const [repoUserPicked, setRepoUserPicked] = useState(false);
  const [baseUserPicked, setBaseUserPicked] = useState(false);

  const [defaultRepoSetting, setDefaultRepoSetting] = useState<string>("");
  const [defaultBaseBranchSetting, setDefaultBaseBranchSetting] = useState<string>("");

  useEffect(() => {
    readAppSettings().then(({ settings }) => {
      setDefaultRepoSetting(settings.defaultRepo);
      setDefaultBaseBranchSetting(settings.defaultBaseBranch);
    });
  }, []);

  useEffect(() => {
    if (repoUserPicked) return;
    if (repoList.length === 0) return;

    const wanted = defaultRepoSetting.trim();
    const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, "");
    const wantedNorm = wanted ? norm(wanted) : "";

    const byPref = wantedNorm
      ? repoList.find((r) => norm(r.name) === wantedNorm) ?? repoList.find((r) => norm(r.name).includes(wantedNorm))
      : undefined;
    const byProject = repoList.find((r) => r.projectName === item.project && norm(r.name) === norm(item.project));
    const projectFirst = repoList.find((r) => r.projectName === item.project);
    const preferred = byPref ?? byProject ?? projectFirst ?? repoList[0];

    if (preferred.id !== repoId) {
      setRepoId(preferred.id);
    }

    if (wanted && !byPref) {
      const sample = repoList
        .slice(0, 8)
        .map((r) => `${r.projectName}/${r.name}`)
        .join(", ");
      const more = repoList.length > 8 ? ` … (+${repoList.length - 8} more)` : "";
      showToast({
        style: Toast.Style.Failure,
        title: `Default repo "${wanted}" not found among ${repoList.length}`,
        message: `${sample}${more}`,
      });
    }
  }, [repoList, repoUserPicked, item.project, defaultRepoSetting]);

  const handleRepoChange = (id: string) => {
    if (id === repoId) return;
    if (id === "") return;
    setRepoId(id);
    setRepoUserPicked(true);
    setBaseUserPicked(false);
  };

  const handleBaseBranchChange = (b: string) => {
    if (b === baseBranch) return;
    if (b === "") return;
    setBaseBranch(b);
    setBaseUserPicked(true);
  };

  const repo = repoList.find((r) => r.id === repoId);
  const repoDefault = repo?.defaultBranch.replace(/^refs\/heads\//, "");

  const { data: branches, isLoading: loadingBranches } = useCachedPromise(
    async (project: string, id: string) => {
      if (!id || !project) return [];
      return getBranches(project, id);
    },
    [repo?.projectName ?? "", repoId],
    { initialData: [] as string[], keepPreviousData: false },
  );

  const branchList = branches ?? [];

  const safeBaseBranch = branchList.includes(baseBranch) ? baseBranch : "";
  const safeRepoId = repoList.some((r) => r.id === repoId) ? repoId : "";

  useEffect(() => {
    if (baseUserPicked) return;
    if (branchList.length === 0) return;
    const exists = (name: string) => branchList.find((b) => b.toLowerCase() === name.toLowerCase());

    const candidates = [
      defaultBaseBranchSetting.trim(),
      "development",
      "develop",
      "dev",
      repoDefault,
      "main",
      "master",
    ].filter((s): s is string => !!s && s.length > 0);

    let next: string | undefined;
    for (const c of candidates) {
      const found = exists(c);
      if (found) {
        next = found;
        break;
      }
    }
    next = next ?? branchList[0];

    if (next && next !== baseBranch) {
      setBaseBranch(next);
    }
  }, [branchList.join("|"), baseUserPicked, defaultBaseBranchSetting]);

  const handleSubmit = async () => {
    if (!repo) {
      showToast({ style: Toast.Style.Failure, title: "Pick a repository" });
      return;
    }
    const trimmed = branchName.trim();
    if (!trimmed) {
      showToast({ style: Toast.Style.Failure, title: "Branch name required" });
      return;
    }
    if (!baseBranch) {
      showToast({ style: Toast.Style.Failure, title: "Pick a base branch" });
      return;
    }

    setSubmitting(true);
    const toast = await showToast({
      style: Toast.Style.Animated,
      title: `Creating ${trimmed} from ${baseBranch}…`,
    });

    try {
      const { branchName: created, branchUrl } = await createBranchForWorkItem({
        workItemId: item.id,
        repo,
        branchName: trimmed,
        baseBranch,
      });
      await Clipboard.copy(created);
      toast.style = Toast.Style.Success;
      toast.title = `Created ${created}`;
      toast.message = `From ${baseBranch} · copied to clipboard`;
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

  return (
    <Form
      isLoading={isLoading || loadingBranches || submitting}
      navigationTitle={`#${item.id} — Create Branch`}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Create Branch" icon={Icon.NewDocument} onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.Description text={`Branch will be created from "${baseBranch || "…"}" and linked to #${item.id}.`} />
      <Form.Dropdown id="repo" title="Repository" value={safeRepoId} onChange={handleRepoChange}>
        <Form.Dropdown.Item value="" title={repoList.length === 0 ? "Loading repos…" : "—"} />
        {repoList.map((r) => (
          <Form.Dropdown.Item key={r.id} value={r.id} title={`${r.name}  ·  ${r.projectName}`} />
        ))}
      </Form.Dropdown>
      <Form.Dropdown id="baseBranch" title="Base Branch" value={safeBaseBranch} onChange={handleBaseBranchChange}>
        <Form.Dropdown.Item value="" title={branchList.length === 0 ? "Loading branches…" : "—"} />
        {branchList.map((b) => (
          <Form.Dropdown.Item key={b} value={b} title={b === repoDefault ? `${b}  (default)` : b} />
        ))}
      </Form.Dropdown>
      <Form.TextField id="branchName" title="Branch Name" value={branchName} onChange={setBranchName} />
    </Form>
  );
}

function CreateWorkItemForm({
  knownProjects,
  onCreated,
}: {
  knownProjects: string[];
  onCreated?: (item: WorkItem) => void;
}) {
  const { pop, push } = useNavigation();
  const prefs = getPreferenceValues<Preferences>();

  const [appDefaultProject, setAppDefaultProject] = useState<string>("");
  useEffect(() => {
    readAppSettings().then(({ settings }) => setAppDefaultProject(settings.project));
  }, []);

  const { data: fetchedProjects, isLoading: loadingProjects } = useCachedPromise(getProjects, [], { initialData: [] });

  const projectNames = Array.from(
    new Set([
      ...knownProjects,
      ...(fetchedProjects ?? []).map((p) => p.name),
      ...(appDefaultProject ? [appDefaultProject] : []),
    ]),
  ).sort();

  const [project, setProject] = useState<string>("");
  const [type, setType] = useState<string>("");
  const [typeUserPicked, setTypeUserPicked] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [assignee, setAssignee] = useState<string>(prefs.email);
  const [parentId, setParentId] = useState("");
  const [createBranch, setCreateBranch] = useState(true);
  const [files, setFiles] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!project && appDefaultProject) {
      setProject(appDefaultProject);
    }
  }, [appDefaultProject, project]);

  useEffect(() => {
    if (!project && projectNames.length > 0) {
      setProject(projectNames[0]);
    }
  }, [project, projectNames]);

  const { data: types, isLoading: loadingTypes } = useCachedPromise(
    async (p: string): Promise<WorkItemTypeInfo[]> => {
      if (!p) return [];
      return getWorkItemTypes(p);
    },
    [project],
    {
      initialData: [] as WorkItemTypeInfo[],
      keepPreviousData: false,
    },
  );
  const typeList: string[] = (types ?? []).map((t) => t.name);

  useEffect(() => {
    setTypeUserPicked(false);
  }, [project]);

  useEffect(() => {
    if (typeUserPicked) return;
    if (typeList.length === 0) return;
    const preferred =
      typeList.find((t) => t === "Issue") ??
      typeList.find((t) => t === "Task") ??
      typeList.find((t) => t === "User Story") ??
      typeList[0];
    if (preferred && preferred !== type) {
      setType(preferred);
    }
  }, [typeList.join("|"), typeUserPicked]);

  const safeType = typeList.includes(type) ? type : "";
  const handleTypeChange = (t: string) => {
    if (t === type || t === "") return;
    setType(t);
    setTypeUserPicked(true);
  };

  const handleSubmit = async () => {
    if (!title.trim()) {
      showToast({ style: Toast.Style.Failure, title: "Title is required" });
      return;
    }
    if (!project) {
      showToast({ style: Toast.Style.Failure, title: "Pick a project" });
      return;
    }
    if (!type) {
      showToast({ style: Toast.Style.Failure, title: "Pick a work item type" });
      return;
    }
    const parsedParent = parentId.trim() ? Number(parentId.trim()) : undefined;
    if (parsedParent !== undefined && !Number.isFinite(parsedParent)) {
      showToast({
        style: Toast.Style.Failure,
        title: "Parent must be a numeric ID",
      });
      return;
    }

    setSubmitting(true);
    const toast = await showToast({
      style: Toast.Style.Animated,
      title: `Creating ${type}…`,
    });

    try {
      const attachments = files.map((filePath) => ({
        filePath,
        name: filePath.split("/").pop() ?? "attachment",
      }));
      const created = await createWorkItem({
        project,
        type,
        title: title.trim(),
        description: description.trim() || undefined,
        assignedTo: assignee.trim() || undefined,
        parentId: parsedParent,
        attachments,
      });

      toast.style = Toast.Style.Success;
      toast.title = `Created #${created.id}`;
      toast.message = created.title;
      onCreated?.(created);

      if (createBranch) {
        pop();
        push(<CreateBranchForm item={created} />);
      } else {
        pop();
      }
    } catch (err) {
      toast.style = Toast.Style.Failure;
      toast.title = "Failed to create work item";
      toast.message = err instanceof Error ? err.message : String(err);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Form
      isLoading={loadingProjects || loadingTypes || submitting}
      navigationTitle="New Work Item"
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Create" icon={Icon.Plus} onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.Dropdown id="project" title="Project" value={project} onChange={setProject}>
        {projectNames.map((p) => (
          <Form.Dropdown.Item key={p} value={p} title={p} />
        ))}
      </Form.Dropdown>
      <Form.Dropdown id="type" title="Type" value={safeType} onChange={handleTypeChange}>
        <Form.Dropdown.Item
          value=""
          title={typeList.length === 0 ? (loadingTypes ? "Loading types…" : "No types available") : "—"}
        />
        {typeList.map((t) => {
          const acc = getTypeAccessory(t);
          return (
            <Form.Dropdown.Item key={t} value={t} title={t} icon={{ source: acc.icon, tintColor: acc.tintColor }} />
          );
        })}
      </Form.Dropdown>
      <Form.TextField id="title" title="Title" placeholder="Short summary" value={title} onChange={setTitle} />
      <Form.TextArea
        id="description"
        title="Description"
        placeholder="Optional — what needs doing"
        value={description}
        onChange={setDescription}
      />
      <Form.TextField
        id="assignee"
        title="Assignee"
        placeholder="email@example.com"
        value={assignee}
        onChange={setAssignee}
      />
      <Form.TextField
        id="parentId"
        title="Parent"
        placeholder="Optional work item ID, e.g. 588"
        value={parentId}
        onChange={setParentId}
      />
      <Form.FilePicker
        id="files"
        title="Attachment"
        allowMultipleSelection={false}
        canChooseDirectories={false}
        value={files}
        onChange={setFiles}
      />
      <Form.Checkbox
        id="createBranch"
        label="Create a branch after the work item is created"
        value={createBranch}
        onChange={setCreateBranch}
      />
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

function ChangeStateView({ item, onUpdated }: { item: WorkItem; onUpdated: (updated: WorkItem) => void }) {
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

    if (newState === "Closed" || newState === "Removed" || newState === "Done") {
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
    <List isLoading={isLoading} navigationTitle={`#${item.id} — Change State`} searchBarPlaceholder="Choose new state…">
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
              <Action title={`Set to ${state}`} icon={Icon.Checkmark} onAction={() => handleChange(state)} />
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
