import {
  List,
  ActionPanel,
  Action,
  Form,
  Icon,
  Keyboard,
  Alert,
  Clipboard,
  Color,
  confirmAlert,
  showToast,
  Toast,
  trash,
  useNavigation,
  LocalStorage,
} from "@raycast/api";
import { useEffect, useState } from "react";
import fs from "node:fs";
import path from "node:path";
import { getSettings } from "@/settings";
import { getTranslations } from "@/i18n";
import { SortBySubmenu, sortItems, sortOptionTitle, useSortOption } from "@/core/ui/sorting";
import type { SortOption } from "@/core/ui/sorting";
import { groupItems } from "@/core/ui/grouping";
import { collectBounces, resolveBouncesFolder } from "@/core/projects/bounces";
import type { BounceWithSource } from "@/core/projects/bounces";
import { setExternalBounces } from "@/core/metadata/project-metadata";
import { ManageExternalBounces } from "@/core/ui/components/project/manage-external-bounces";
import { showFailure } from "@/core/ui/toast";

const t = getTranslations(getSettings().language);

const BOUNCES_SORT_STORAGE_KEY = "bounces-sort-option";
const BOUNCES_GROUP_STORAGE_KEY = "bounces-group-option";
const BOUNCES_SORT_OPTIONS: SortOption[] = [
  "created-desc",
  "created-asc",
  "modified-desc",
  "modified-asc",
  "name-asc",
  "name-desc",
  "size-desc",
  "size-asc",
];

// Browse Bounces 本地分组维度：在共享的日期分组之外额外支持按来源分组，
// 不污染共享的 grouping 模块（其 GroupOption 还被 Search Projects 复用）。
type BounceGroup = "source" | "created" | "modified" | "none";

function isBounceGroup(value: string): value is BounceGroup {
  return value === "source" || value === "created" || value === "modified" || value === "none";
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  const units = ["KB", "MB", "GB", "TB"];
  let value = bytes / 1024;
  let unitIndex = 0;
  while (value >= 1024 && unitIndex < units.length - 1) {
    value /= 1024;
    unitIndex++;
  }
  return `${value.toFixed(1)} ${units[unitIndex]}`;
}

// 拆出文件名主体与后缀：后缀在列表里用 subtitle 以次级灰显示。
function splitExt(name: string): { stem: string; ext: string } {
  const ext = path.extname(name);
  return { stem: ext ? name.slice(0, -ext.length) : name, ext };
}

function BounceGroupSubmenu(props: { value: BounceGroup; onChange: (next: BounceGroup) => void }) {
  const options: [BounceGroup, string][] = [
    ["source", t.groupBySource],
    ["created", t.groupByCreated],
    ["modified", t.groupByModified],
    ["none", t.groupNone],
  ];
  return (
    <ActionPanel.Submenu title={t.groupBy} icon={Icon.List}>
      {options.map(([value, title]) => (
        <Action
          key={value}
          title={title}
          icon={props.value === value ? Icon.CheckCircle : Icon.Circle}
          onAction={() => props.onChange(value)}
        />
      ))}
    </ActionPanel.Submenu>
  );
}

function RenameBounceForm({ current, onSubmit }: { current: string; onSubmit: (name: string) => void }) {
  const { pop } = useNavigation();
  const [value, setValue] = useState(current);
  function handleSubmit() {
    onSubmit(value);
    pop();
  }
  return (
    <Form
      navigationTitle={t.renameBounce}
      actions={
        <ActionPanel>
          <Action.SubmitForm title={t.save} icon={Icon.Check} onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField id="name" title={t.name} value={value} onChange={setValue} />
    </Form>
  );
}

export function Bounces(props: {
  projectId: string;
  projectName: string;
  projectPath: string;
  externalFolders: string[];
  externalFiles: string[];
  onChanged?: () => void;
}) {
  const { pop } = useNavigation();
  const [folders, setFolders] = useState<string[]>(props.externalFolders);
  const [files, setFiles] = useState<string[]>(props.externalFiles);
  const [bounces, setBounces] = useState<BounceWithSource[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [sortBy, setSortBy] = useSortOption(BOUNCES_SORT_STORAGE_KEY, BOUNCES_SORT_OPTIONS, "created-desc");
  const [groupBy, setGroupByState] = useState<BounceGroup>("source");
  const [reloadToken, setReloadToken] = useState(0);

  // 读取持久化的分组选择（含 "source"）。
  useEffect(() => {
    void LocalStorage.getItem<string>(BOUNCES_GROUP_STORAGE_KEY).then((stored) => {
      if (stored && isBounceGroup(stored)) setGroupByState(stored);
    });
  }, []);

  const setGroupBy = (next: BounceGroup) => {
    setGroupByState(next);
    void LocalStorage.setItem(BOUNCES_GROUP_STORAGE_KEY, next);
  };

  // 列表 = 默认 Bounces 文件夹 + 外部来源（去重、带来源标记、含不可用占位）。
  useEffect(() => {
    setBounces(
      collectBounces({
        defaultFolder: resolveBouncesFolder(props.projectPath),
        externalFolders: folders,
        externalFiles: files,
      }),
    );
    setIsLoading(false);
  }, [props.projectPath, folders, files, reloadToken]);

  const handleTrash = async (bounce: BounceWithSource) => {
    const confirmed = await confirmAlert({
      title: t.moveToTrash,
      icon: Icon.Trash,
      message: `${t.trashBounceHint}\n${bounce.name}`,
      primaryAction: { title: t.moveToTrash, style: Alert.ActionStyle.Destructive },
    });
    if (!confirmed) return;
    try {
      await trash(bounce.path);
    } catch (error) {
      // 文件被占用、权限不足、外接盘已拔出等：如实提示，不更新登记记录。
      await showFailure(t.trashFailed, error);
      return;
    }
    // 若删掉的正是被登记的外部文件来源，顺手移除记录（用户经扩展主动删除，确知已不存在）。
    if (files.includes(bounce.path)) {
      const nextFiles = files.filter((f) => f !== bounce.path);
      setFiles(nextFiles);
      await setExternalBounces(props.projectId, folders, nextFiles);
      props.onChanged?.();
    }
    setReloadToken((n) => n + 1);
    await showToast({ style: Toast.Style.Success, title: t.movedToTrash, message: bounce.name });
  };

  const handleCopy = async (bounce: BounceWithSource) => {
    await Clipboard.copy({ file: bounce.path });
    await showToast({ style: Toast.Style.Success, title: t.bounceCopied, message: bounce.name });
  };

  const handleRename = async (bounce: BounceWithSource, rawName: string) => {
    const base = rawName.trim();
    if (base === "" || base.includes("/") || base.includes(":")) {
      await showToast({ style: Toast.Style.Failure, title: t.invalidName });
      return;
    }
    const ext = path.extname(bounce.path);
    // 输入框只含文件名主体（不带后缀），统一补回原后缀——即使名字里带点也不会误判成扩展名。
    const finalName = `${base}${ext}`;
    const newPath = path.join(path.dirname(bounce.path), finalName);
    if (newPath === bounce.path) return;
    if (fs.existsSync(newPath)) {
      await showToast({ style: Toast.Style.Failure, title: t.bounceNameExists });
      return;
    }
    try {
      fs.renameSync(bounce.path, newPath);
    } catch (error) {
      await showFailure(t.renameFailed, error);
      return;
    }
    // 外部「文件」来源：路径即登记路径，改名后同步更新记录，否则记录会指向旧名而失效。
    if (files.includes(bounce.path)) {
      const nextFiles = files.map((f) => (f === bounce.path ? newPath : f));
      setFiles(nextFiles);
      await setExternalBounces(props.projectId, folders, nextFiles);
      props.onChanged?.();
    }
    setReloadToken((n) => n + 1);
    await showToast({ style: Toast.Style.Success, title: t.bounceRenamed, message: finalName });
  };

  const removeSource = async (sourcePath: string) => {
    const confirmed = await confirmAlert({
      icon: Icon.MinusCircle,
      title: t.removeExternalSourceConfirmTitle,
      message: `${t.removeExternalSourceConfirmHint}\n${sourcePath}`,
      primaryAction: { title: t.removeExternalSource, style: Alert.ActionStyle.Destructive },
    });
    if (!confirmed) return;
    const nextFolders = folders.filter((f) => f !== sourcePath);
    const nextFiles = files.filter((f) => f !== sourcePath);
    setFolders(nextFolders);
    setFiles(nextFiles);
    await setExternalBounces(props.projectId, nextFolders, nextFiles);
    props.onChanged?.();
    await showToast({ style: Toast.Style.Success, title: t.externalSourceRemoved });
  };

  const renderManageAction = () => (
    <Action.Push
      title={t.manageExternalBounce}
      icon={Icon.Link}
      target={
        <ManageExternalBounces
          projectId={props.projectId}
          projectTitle={props.projectName}
          externalFolders={folders}
          externalFiles={files}
          onSaved={(nextFolders, nextFiles) => {
            setFolders(nextFolders);
            setFiles(nextFiles);
            props.onChanged?.();
          }}
        />
      }
    />
  );

  const bySort = (items: BounceWithSource[]) =>
    sortItems(items, sortBy, (b) => ({ created: b.createdAt, modified: b.modifiedAt, name: b.name, size: b.size }));

  const groups: { key: string; title: string; subtitle: string; items: BounceWithSource[] }[] =
    groupBy === "source"
      ? (["project", "external"] as const)
          .map((kind) => {
            const items = bySort(bounces.filter((b) => b.source === kind));
            return {
              key: kind,
              title: kind === "project" ? t.sourceProjectFolder : t.sourceExternal,
              subtitle: String(items.length),
              items,
            };
          })
          .filter((group) => group.items.length > 0)
      : groupItems(
          bySort(bounces),
          groupBy,
          (b) => ({ created: b.createdAt, modified: b.modifiedAt }),
          sortOptionTitle(sortBy),
        );

  return (
    <List
      isLoading={isLoading}
      navigationTitle={`${t.browseBounces} — ${props.projectName}`}
      searchBarPlaceholder={t.searchBounces}
    >
      {groups.length === 0 ? (
        <List.EmptyView icon={Icon.Waveform} title={t.noBounces} />
      ) : (
        groups.map((group) => (
          <List.Section key={group.key} title={group.title} subtitle={group.subtitle}>
            {group.items.map((b) => (
              <List.Item
                key={b.path}
                title={splitExt(b.name).stem}
                subtitle={splitExt(b.name).ext}
                icon="bounce.png"
                accessories={
                  b.available ? [{ text: formatSize(b.size) }] : [{ tag: { value: t.unavailable, color: Color.Red } }]
                }
                quickLook={b.available ? { path: b.path, name: b.name } : undefined}
                actions={
                  <ActionPanel>
                    {b.available ? (
                      <ActionPanel.Section>
                        <Action.ToggleQuickLook />
                        <Action.Open
                          title={t.openInDefaultApp}
                          icon={Icon.AppWindow}
                          target={b.path}
                          shortcut={Keyboard.Shortcut.Common.Open}
                        />
                        {renderManageAction()}
                        <Action.ShowInFinder
                          title={t.showInFinder}
                          path={b.path}
                          shortcut={{ modifiers: ["cmd", "opt"], key: "o" }}
                        />
                        <Action.Push
                          title={t.renameBounce}
                          icon={Icon.Pencil}
                          shortcut={Keyboard.Shortcut.Common.Edit}
                          target={
                            <RenameBounceForm
                              current={splitExt(b.name).stem}
                              onSubmit={(name) => void handleRename(b, name)}
                            />
                          }
                        />
                      </ActionPanel.Section>
                    ) : (
                      <ActionPanel.Section>
                        {renderManageAction()}
                        <Action.CopyToClipboard
                          content={b.path}
                          title={t.copyBouncePath}
                          icon={Icon.CopyClipboard}
                          shortcut={Keyboard.Shortcut.Common.CopyPath}
                        />
                      </ActionPanel.Section>
                    )}
                    {b.available && (
                      <ActionPanel.Section title={t.sectionCopy}>
                        <Action
                          title={t.copyBounce}
                          icon={Icon.CopyClipboard}
                          shortcut={Keyboard.Shortcut.Common.Copy}
                          onAction={() => handleCopy(b)}
                        />
                        <Action.CopyToClipboard
                          content={b.name}
                          title={t.copyBounceName}
                          icon={Icon.CopyClipboard}
                          shortcut={Keyboard.Shortcut.Common.CopyName}
                        />
                        <Action.CopyToClipboard
                          content={b.path}
                          title={t.copyBouncePath}
                          icon={Icon.CopyClipboard}
                          shortcut={Keyboard.Shortcut.Common.CopyPath}
                        />
                      </ActionPanel.Section>
                    )}
                    <ActionPanel.Section title={t.sectionArrange}>
                      <BounceGroupSubmenu value={groupBy} onChange={setGroupBy} />
                      <SortBySubmenu allowed={BOUNCES_SORT_OPTIONS} value={sortBy} onChange={setSortBy} />
                    </ActionPanel.Section>
                    <ActionPanel.Section title={t.sectionNavigate}>
                      <Action
                        title={t.backToProjects}
                        icon={Icon.Compass}
                        shortcut={{ modifiers: ["opt"], key: "return" }}
                        onAction={pop}
                      />
                    </ActionPanel.Section>
                    {b.available ? (
                      <ActionPanel.Section title={t.sectionDangerZone}>
                        <Action
                          title={t.moveToTrash}
                          icon={Icon.Trash}
                          style={Action.Style.Destructive}
                          shortcut={Keyboard.Shortcut.Common.Remove}
                          onAction={() => handleTrash(b)}
                        />
                      </ActionPanel.Section>
                    ) : (
                      b.source === "external" &&
                      b.externalSource !== undefined && (
                        <ActionPanel.Section title={t.sectionDangerZone}>
                          <Action
                            title={t.removeExternalSource}
                            icon={Icon.MinusCircle}
                            style={Action.Style.Destructive}
                            shortcut={Keyboard.Shortcut.Common.Remove}
                            onAction={() => removeSource(b.externalSource as string)}
                          />
                        </ActionPanel.Section>
                      )
                    )}
                  </ActionPanel>
                }
              />
            ))}
          </List.Section>
        ))
      )}
    </List>
  );
}
