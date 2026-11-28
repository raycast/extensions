import {
  List,
  ActionPanel,
  Action,
  Form,
  Icon,
  Keyboard,
  Alert,
  Color,
  confirmAlert,
  showToast,
  Toast,
  trash,
  useNavigation,
} from "@raycast/api";
import { useEffect, useState } from "react";
import fs from "node:fs";
import path from "node:path";
import { strings } from "@/strings";
import { SortBySubmenu } from "@/core/ui/actions/sort-by-submenu";
import { CopyBounceSection } from "./copy-bounce-section";
import { ShowInFinderAction } from "@/core/ui/actions/show-in-finder";
import { useSortOption } from "@/core/ui/hooks/use-sort-option";
import { sortItems, sortOptionTitle } from "@/core/ui/shared/sorting";
import type { SortOption } from "@/core/ui/shared/sorting";
import { groupItems, type BounceGroup } from "@/core/ui/shared/grouping";
import { formatSize, groupBySource, splitExt } from "@/core/ui/bounces/bounce-format";
import { useBounceGroupOption } from "./use-bounce-group-option";
import {
  collectBounces,
  getSharedBounceExclusions,
  projectBounceSources,
  setSharedBounceExclusions,
} from "@/core/projects/bounces";
import type { BounceWithSource } from "@/core/projects/bounces";
import { addExcludedSharedBounce, setExternalBounces } from "@/core/metadata/project-metadata";
import { ManageExternalBounces } from "@/core/ui/components/manage-external-bounces";
import { copyWithHud, showFailure } from "@/core/ui/shared/toast";

const BOUNCES_SORT_STORAGE_KEY = "bounces-sort-option";
const BOUNCES_GROUP_STORAGE_KEY = "bounces-group-option";
export const BOUNCES_SORT_OPTIONS: SortOption[] = [
  "created-desc",
  "created-asc",
  "modified-desc",
  "modified-asc",
  "name-asc",
  "name-desc",
  "size-desc",
  "size-asc",
];

export function BounceGroupSubmenu(props: { value: BounceGroup; onChange: (next: BounceGroup) => void }) {
  const options: [BounceGroup, string][] = [
    ["source", strings.groupBySource],
    ["created", strings.groupByCreated],
    ["modified", strings.groupByModified],
    ["none", strings.groupNone],
  ];
  return (
    <ActionPanel.Submenu title={strings.groupBy} icon={Icon.List}>
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

function RenameBounceForm({
  current,
  onSubmit,
}: {
  current: string;
  /** 返回是否保存成功：失败时表单不关，保留输入。 */
  onSubmit: (name: string) => Promise<boolean>;
}) {
  const { pop } = useNavigation();
  const [value, setValue] = useState(current);
  async function handleSubmit() {
    if (!(await onSubmit(value))) return;
    pop();
  }
  return (
    <Form
      navigationTitle={strings.renameBounce}
      actions={
        <ActionPanel>
          <Action.SubmitForm title={strings.save} icon={Icon.Check} onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField id="name" title={strings.name} placeholder={current} value={value} onChange={setValue} />
    </Form>
  );
}

export function Bounces(props: {
  projectId: string;
  projectName: string;
  projectPath: string;
  externalFolders: string[];
  externalFiles: string[];
  // 返回按钮的文字由入口决定：同一个视图能从 Search Projects 和 Search Bounces 进来。
  backTitle: string;
  onChanged?: () => void;
}) {
  const { pop } = useNavigation();
  const [folders, setFolders] = useState<string[]>(props.externalFolders);
  const [files, setFiles] = useState<string[]>(props.externalFiles);
  const [bounces, setBounces] = useState<BounceWithSource[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [sortBy, setSortBy] = useSortOption(BOUNCES_SORT_STORAGE_KEY, BOUNCES_SORT_OPTIONS, "created-desc");
  // 键名不变，旧版本存在 LocalStorage 里的值第一次读到时搬过来。
  const [groupBy, setGroupBy] = useBounceGroupOption(BOUNCES_GROUP_STORAGE_KEY, "source", {
    key: BOUNCES_GROUP_STORAGE_KEY,
  });
  const [reloadToken, setReloadToken] = useState(0);

  // 列表 = 默认 Bounces 文件夹 + 外部来源（去重、带来源标记、含不可用占位）。
  useEffect(() => {
    setBounces(
      collectBounces(
        projectBounceSources({
          title: props.projectName,
          folderPath: props.projectPath,
          externalBounceFolders: folders,
          externalBounceFiles: files,
        }),
      ),
    );
    setIsLoading(false);
  }, [props.projectPath, props.projectName, folders, files, reloadToken]);

  const handleTrash = async (bounce: BounceWithSource) => {
    const confirmed = await confirmAlert({
      title: strings.moveToTrash,
      icon: Icon.Trash,
      message: `${strings.trashBounceHint}\n${bounce.name}`,
      primaryAction: { title: strings.moveToTrash, style: Alert.ActionStyle.Destructive },
    });
    if (!confirmed) return;
    try {
      await trash(bounce.path);
    } catch (error) {
      // 文件被占用、权限不足、外接盘已拔出等：如实提示，不更新登记记录。
      await showFailure(strings.trashBounceFailed, error);
      return;
    }
    // 若删掉的正是被登记的外部文件来源，顺手移除记录（用户经扩展主动删除，确知已不存在）。
    // 先存再改界面：存失败时界面保持原样，这个来源仍显示为不可用。
    let recordError: unknown = null;
    if (files.includes(bounce.path)) {
      const nextFiles = files.filter((f) => f !== bounce.path);
      try {
        await setExternalBounces(props.projectId, folders, nextFiles);
        setFiles(nextFiles);
      } catch (error) {
        recordError = error;
      }
      props.onChanged?.();
    }
    setReloadToken((n) => n + 1);
    // 文件已经进了废纸篓，登记没改成功时只提示，不让整个操作看起来没成功。
    if (recordError !== null) {
      await showFailure(strings.saveFailed, recordError);
      return;
    }
    await showToast({ style: Toast.Style.Success, title: strings.bounceMovedToTrash, message: bounce.name });
  };

  const handleCopy = async (bounce: BounceWithSource) => {
    await copyWithHud({ file: bounce.path }, strings.bounceCopied);
  };

  // 返回是否保存成功：表单据此决定关不关。
  const handleRename = async (bounce: BounceWithSource, rawName: string): Promise<boolean> => {
    const base = rawName.trim();
    if (base === "" || base.includes("/") || base.includes(":")) {
      await showToast({ style: Toast.Style.Failure, title: strings.invalidName });
      return false;
    }
    const ext = path.extname(bounce.path);
    // 输入框只含文件名主体（不带后缀），统一补回原后缀——即使名字里带点也不会误判成扩展名。
    const finalName = `${base}${ext}`;
    const newPath = path.join(path.dirname(bounce.path), finalName);
    if (newPath === bounce.path) return true;
    if (fs.existsSync(newPath)) {
      await showToast({ style: Toast.Style.Failure, title: strings.bounceNameExists });
      return false;
    }
    try {
      fs.renameSync(bounce.path, newPath);
    } catch (error) {
      await showFailure(strings.renameBounceFailed, error);
      return false;
    }
    // 外部「文件」来源：路径即登记路径，改名后同步更新记录，否则记录会指向旧名而失效。
    // 文件已经改好了，这里失败只提示，不让表单以为整个操作没成功。
    if (files.includes(bounce.path)) {
      const nextFiles = files.map((f) => (f === bounce.path ? newPath : f));
      try {
        await setExternalBounces(props.projectId, folders, nextFiles);
        setFiles(nextFiles);
      } catch (error) {
        await showFailure(strings.saveFailed, error);
      }
      props.onChanged?.();
    }
    setReloadToken((n) => n + 1);
    await showToast({ style: Toast.Style.Success, title: strings.bounceRenamed, message: finalName });
    return true;
  };

  // 共享文件夹里配错的文件：标成不属于这个项目，退回 Unmatched Bounces。
  const handleNotThisProject = async (bounce: BounceWithSource) => {
    await addExcludedSharedBounce(props.projectId, bounce.name);
    const exclusions = getSharedBounceExclusions();
    setSharedBounceExclusions({
      ...exclusions,
      [props.projectName]: [...(exclusions[props.projectName] ?? []), bounce.name],
    });
    setReloadToken((n) => n + 1);
    props.onChanged?.();
    await showToast({ style: Toast.Style.Success, title: strings.movedToUnmatched, message: bounce.name });
  };

  const removeSource = async (sourcePath: string) => {
    const confirmed = await confirmAlert({
      icon: Icon.MinusCircle,
      title: strings.removeExternalSourceConfirmTitle,
      message: `${strings.removeExternalSourceConfirmHint}\n${sourcePath}`,
      primaryAction: { title: strings.removeExternalSource, style: Alert.ActionStyle.Destructive },
    });
    if (!confirmed) return;
    const nextFolders = folders.filter((f) => f !== sourcePath);
    const nextFiles = files.filter((f) => f !== sourcePath);
    // 先存再改界面：存失败时界面保持原样，不会和磁盘上的登记对不上。
    try {
      await setExternalBounces(props.projectId, nextFolders, nextFiles);
    } catch (error) {
      await showFailure(strings.saveFailed, error);
      return;
    }
    setFolders(nextFolders);
    setFiles(nextFiles);
    props.onChanged?.();
    await showToast({ style: Toast.Style.Success, title: strings.externalSourceRemoved });
  };

  const renderManageAction = () => (
    <Action.Push
      title={strings.manageExternalBounce}
      icon={Icon.Link}
      shortcut={{ modifiers: ["cmd"], key: "b" }}
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
      ? groupBySource(bounces, ["project", "shared", "external"], (b) => b.source, bySort)
      : groupItems(
          bySort(bounces),
          groupBy,
          (b) => ({ created: b.createdAt, modified: b.modifiedAt }),
          sortOptionTitle(sortBy),
        );

  return (
    <List
      isLoading={isLoading}
      navigationTitle={`${strings.browseBounces} — ${props.projectName}`}
      searchBarPlaceholder={strings.searchProjectBounces}
    >
      {groups.length === 0 ? (
        <List.EmptyView icon={Icon.Waveform} title={strings.noBounces} />
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
                  b.available
                    ? [{ text: formatSize(b.size) }]
                    : [{ tag: { value: strings.unavailable, color: Color.Red } }]
                }
                quickLook={b.available ? { path: b.path, name: b.name } : undefined}
                actions={
                  <ActionPanel>
                    {b.available ? (
                      <ActionPanel.Section>
                        <Action.ToggleQuickLook />
                        <Action.Open
                          title={strings.openInDefaultApp}
                          icon={Icon.AppWindow}
                          target={b.path}
                          shortcut={Keyboard.Shortcut.Common.Open}
                        />
                        {renderManageAction()}
                        <ShowInFinderAction path={b.path} />
                        <Action.Push
                          title={strings.renameBounce}
                          icon={Icon.Pencil}
                          shortcut={Keyboard.Shortcut.Common.Edit}
                          target={
                            <RenameBounceForm
                              current={splitExt(b.name).stem}
                              onSubmit={(name) => handleRename(b, name)}
                            />
                          }
                        />
                        {b.source === "shared" && (
                          <Action
                            title={strings.notThisProject}
                            icon={Icon.XMarkCircle}
                            onAction={() => handleNotThisProject(b)}
                          />
                        )}
                      </ActionPanel.Section>
                    ) : (
                      <ActionPanel.Section>
                        {renderManageAction()}
                        <Action
                          title={strings.copyBouncePath}
                          icon={Icon.CopyClipboard}
                          shortcut={Keyboard.Shortcut.Common.CopyPath}
                          onAction={() => void copyWithHud(b.path, strings.bouncePathCopied)}
                        />
                      </ActionPanel.Section>
                    )}
                    {b.available && <CopyBounceSection name={b.name} path={b.path} onCopy={() => handleCopy(b)} />}
                    <ActionPanel.Section title={strings.sectionArrange}>
                      <BounceGroupSubmenu value={groupBy} onChange={setGroupBy} />
                      <SortBySubmenu allowed={BOUNCES_SORT_OPTIONS} value={sortBy} onChange={setSortBy} />
                    </ActionPanel.Section>
                    <ActionPanel.Section title={strings.sectionNavigate}>
                      <Action
                        title={props.backTitle}
                        icon={Icon.Compass}
                        shortcut={{ modifiers: ["opt"], key: "return" }}
                        onAction={pop}
                      />
                    </ActionPanel.Section>
                    {b.available ? (
                      <ActionPanel.Section title={strings.sectionDangerZone}>
                        <Action
                          title={strings.moveToTrash}
                          icon={Icon.Trash}
                          style={Action.Style.Destructive}
                          shortcut={Keyboard.Shortcut.Common.Remove}
                          onAction={() => handleTrash(b)}
                        />
                      </ActionPanel.Section>
                    ) : (
                      b.source === "external" &&
                      b.externalSource !== undefined && (
                        <ActionPanel.Section title={strings.sectionDangerZone}>
                          <Action
                            title={strings.removeExternalSource}
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
