import {
  ActionPanel,
  Action,
  Alert,
  closeMainWindow,
  Color,
  confirmAlert,
  Form,
  Icon,
  Image,
  Keyboard,
  List,
  showToast,
  Toast,
  openExtensionPreferences,
  useNavigation,
} from "@raycast/api";
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { useEffect, useState } from "react";
import type { DawSet, ProjectFileMetadata } from "@/daws";
import { logicAdapter } from "./adapter";
import {
  EMPTY_METADATA,
  cachedSetMetadata,
  loadPersistentProjectFileCache,
  parseSetMetadata,
} from "@/core/projects/project-file-cache";
import { strings } from "@/strings";
import { listEmptyState } from "@/core/ui/shared/list-empty-state";
import type { Project } from "@/core/projects/types";
import { LOG_PREFIX } from "@/core/log";
import { alternativesViewStrings } from "./strings";
import { openWithDaw } from "@/core/daw-app";
import { useDawApp } from "@/core/ui/hooks/use-daw-app";
import { showFailure, errorMessage } from "@/core/ui/shared/toast";
import { ShowInFinderAction } from "@/core/ui/actions/show-in-finder";
import { labels } from "@/daws/labels";
import { SortBySubmenu } from "@/core/ui/actions/sort-by-submenu";
import { useSortOption } from "@/core/ui/hooks/use-sort-option";
import { sortItems, sortOptionTitle } from "@/core/ui/shared/sorting";
import type { SortOption } from "@/core/ui/shared/sorting";
import { GroupBySubmenu } from "@/core/ui/actions/group-by-submenu";
import { useGroupOption } from "@/core/ui/hooks/use-group-option";
import { groupItems } from "@/core/ui/shared/grouping";
import { alternativeIndex, duplicateName } from "./alternative-rules";
import { duplicateAlternative, renameAlternative, setActiveAlternative, trashAlternative } from "./alternative-edits";

const ALTERNATIVES_SORT_STORAGE_KEY = "alternatives-sort-option";
const ALTERNATIVES_GROUP_STORAGE_KEY = "alternatives-group-option";

const ALTERNATIVES_SORT_OPTIONS: SortOption[] = [
  "modified-desc",
  "modified-asc",
  "created-desc",
  "created-asc",
  "name-asc",
  "name-desc",
];

// windowImage：Logic 保存时截下的工程窗口缩略图（Alternatives/NNN/WindowImage.jpg），没有时为 null。
type ProjectAlternative = DawSet & ProjectFileMetadata & { windowImage: string | null };

export function findWindowImage(set: DawSet): string | null {
  const image = path.join(path.dirname(set.metadataFile), "WindowImage.jpg");
  return fs.existsSync(image) ? image : null;
}

// 详情顶部放缩略图。路径转成 file:// URL，空格、# 这类字符才不会打断 Markdown。
function detailMarkdown(alternative: ProjectAlternative): string {
  return alternative.windowImage ? `![](${pathToFileURL(alternative.windowImage).href})` : "";
}

function RenameAlternativeForm({ alternative, onRenamed }: { alternative: ProjectAlternative; onRenamed: () => void }) {
  const { pop } = useNavigation();
  const [name, setName] = useState(alternative.name);

  async function handleSubmit() {
    const trimmed = name.trim();
    if (trimmed === "" || trimmed === alternative.name) {
      pop();
      return;
    }
    if (trimmed.includes("/") || trimmed.includes(":")) {
      await showToast({ style: Toast.Style.Failure, title: strings.invalidName });
      return;
    }

    const confirmed = await confirmAlert({
      icon: { source: Icon.Warning, tintColor: Color.Yellow },
      title: alternativesViewStrings.changeConfirmTitle,
      message: alternativesViewStrings.changeConfirmMessage,
      primaryAction: { title: strings.rename, style: Alert.ActionStyle.Default },
    });
    if (!confirmed) return;

    try {
      await renameAlternative(alternative.path, alternative, trimmed);
    } catch (error) {
      await showFailure(strings.renameFailed, error);
      return;
    }

    onRenamed();
    await showToast({
      style: Toast.Style.Success,
      title: alternativesViewStrings.alternativeRenamed,
      message: trimmed,
    });
    pop();
  }

  return (
    <Form
      navigationTitle={`${alternativesViewStrings.renameAlternative} — ${alternative.name}`}
      actions={
        <ActionPanel>
          <Action.SubmitForm title={strings.save} onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField id="name" title={strings.name} placeholder={alternative.name} value={name} onChange={setName} />
    </Form>
  );
}

// Logic 项目的 Alternatives：改名、复制、删除都要动 .logicx 包内部，改之前先确认项目没在 Logic 里开着。
export function AlternativesView({ project }: { project: Project }) {
  const [alternatives, setAlternatives] = useState<ProjectAlternative[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  // 读取失败的原因：列表为空时据此显示出错页面，而不是看起来像没有 Alternative。
  const [loadError, setLoadError] = useState<string | null>(null);
  const logicApp = useDawApp();
  const [sortBy, setSortBy] = useSortOption(ALTERNATIVES_SORT_STORAGE_KEY, ALTERNATIVES_SORT_OPTIONS, "created-desc");
  const [groupBy, setGroupBy] = useGroupOption(ALTERNATIVES_GROUP_STORAGE_KEY, "created");
  const [reloadToken, setReloadToken] = useState(0);

  // 只依赖这两个字段：project 对象来自上一层，引用可能每次都变，整个放进依赖会让 effect 反复跑。
  const { folderPath, kind } = project;

  useEffect(() => {
    let cancelled = false;

    async function loadAlternatives() {
      try {
        await loadPersistentProjectFileCache();
        if (cancelled) return;

        // 按编号排（Alternatives/000、001……），和 Logic 菜单里的顺序一致。
        const sets = logicAdapter
          .listSets({ folderPath, kind })
          .sort((a, b) => a.metadataFile.localeCompare(b.metadataFile));
        const items: ProjectAlternative[] = [];
        for (const set of sets) {
          const cached = cachedSetMetadata(set);
          let metadata = cached ?? EMPTY_METADATA;
          if (!cached) {
            try {
              metadata = await parseSetMetadata(set);
            } catch (error) {
              console.error(`${LOG_PREFIX} Failed to load alternative metadata: ${set.metadataFile}`, error);
            }
          }
          if (cancelled) return;
          items.push({ ...set, ...metadata, windowImage: findWindowImage(set) });
        }
        setAlternatives(items);
        setLoadError(null);
      } catch (error) {
        if (!cancelled) {
          console.error(`${LOG_PREFIX} Failed to load alternatives:`, error);
          // 保留已读到的条目：读不到时不该看起来像没有 Alternative。
          setLoadError(errorMessage(error));
        }
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }

    void loadAlternatives();

    return () => {
      cancelled = true;
    };
  }, [folderPath, kind, reloadToken]);

  const reload = () => setReloadToken((n) => n + 1);

  // 出错页面上的 Try Again：重读期间显示加载，读完再收起。
  const retryLoad = () => {
    setIsLoading(true);
    reload();
  };

  // 所有会改文件的操作都先确认：项目在 Logic 里开着时，Logic 下次保存会盖掉这些改动。
  const confirmChange = (title: string, message: string, actionTitle: string) =>
    confirmAlert({
      icon: { source: Icon.Warning, tintColor: Color.Yellow },
      title,
      message,
      primaryAction: { title: actionTitle, style: Alert.ActionStyle.Default },
    });

  const handleOpen = async (alternative: ProjectAlternative) => {
    try {
      if (!alternative.active) {
        const confirmed = await confirmChange(
          alternativesViewStrings.changeConfirmTitle,
          alternativesViewStrings.changeConfirmMessage,
          alternativesViewStrings.openInDaw,
        );
        if (!confirmed) return;
        await setActiveAlternative(alternative.path, alternativeIndex(alternative));
      }
      await openWithDaw(alternative.path);
      await closeMainWindow();
    } catch (error) {
      await showFailure(labels.openSetFailed, error);
    }
  };

  const handleSetActive = async (alternative: ProjectAlternative) => {
    const confirmed = await confirmChange(
      alternativesViewStrings.changeConfirmTitle,
      alternativesViewStrings.changeConfirmMessage,
      alternativesViewStrings.setActive,
    );
    if (!confirmed) return;
    try {
      await setActiveAlternative(alternative.path, alternativeIndex(alternative));
      reload();
      await showToast({
        style: Toast.Style.Success,
        title: alternativesViewStrings.activeChanged,
        message: alternative.name,
      });
    } catch (error) {
      await showFailure(alternativesViewStrings.changeFailed, error);
    }
  };

  const handleDuplicate = async (alternative: ProjectAlternative) => {
    const name = duplicateName(
      alternative.name,
      alternatives.map((item) => item.name),
    );
    const confirmed = await confirmChange(
      alternativesViewStrings.changeConfirmTitle,
      alternativesViewStrings.changeConfirmMessage,
      alternativesViewStrings.duplicateAlternative,
    );
    if (!confirmed) return;
    try {
      await duplicateAlternative(alternative.path, alternative, alternatives.map(alternativeIndex), name);
      reload();
      await showToast({
        style: Toast.Style.Success,
        title: alternativesViewStrings.alternativeDuplicated,
        message: name,
      });
    } catch (error) {
      await showFailure(strings.duplicateFailed, error);
    }
  };

  const handleTrash = async (alternative: ProjectAlternative) => {
    if (alternatives.length <= 1) {
      await showToast({ style: Toast.Style.Failure, title: alternativesViewStrings.lastAlternative });
      return;
    }
    const confirmed = await confirmAlert({
      title: strings.moveToTrash,
      icon: Icon.Trash,
      message: `${alternativesViewStrings.trashAlternativeHint}\n${alternative.name}\n\n${alternativesViewStrings.changeConfirmMessage}`,
      primaryAction: { title: strings.moveToTrash, style: Alert.ActionStyle.Destructive },
    });
    if (!confirmed) return;
    try {
      await trashAlternative(
        alternative.path,
        alternative,
        alternatives.map(alternativeIndex),
        alternative.active === true,
      );
      reload();
      await showToast({ style: Toast.Style.Success, title: strings.movedToTrash, message: alternative.name });
    } catch (error) {
      await showFailure(strings.trashFailed, error);
    }
  };

  const sortedAlternatives = sortItems(alternatives, sortBy, (alternative) => ({
    created: alternative.createdAt,
    modified: alternative.modifiedAt,
    name: alternative.name,
  }));

  return (
    <List
      isLoading={isLoading}
      isShowingDetail
      navigationTitle={project.title}
      searchBarPlaceholder={alternativesViewStrings.searchAlternatives}
    >
      {listEmptyState(isLoading, alternatives.length, loadError) === "error" && (
        <List.EmptyView
          icon={{ source: Icon.ExclamationMark, tintColor: Color.Red }}
          title={alternativesViewStrings.loadFailed}
          description={loadError ?? undefined}
          actions={
            <ActionPanel>
              <Action title={strings.tryAgain} icon={Icon.ArrowClockwise} onAction={retryLoad} />
              <Action title={strings.openExtensionPreferences} icon={Icon.Gear} onAction={openExtensionPreferences} />
            </ActionPanel>
          }
        />
      )}
      {groupItems(
        sortedAlternatives,
        groupBy,
        (alternative) => ({ created: alternative.createdAt, modified: alternative.modifiedAt }),
        sortOptionTitle(sortBy),
      ).map((group) => (
        <List.Section key={group.key} title={group.title} subtitle={group.subtitle}>
          {group.items.map((alternative) => (
            <List.Item
              key={alternative.metadataFile}
              icon={
                alternative.windowImage
                  ? { source: alternative.windowImage, mask: Image.Mask.RoundedRectangle }
                  : Icon.Document
              }
              title={{ value: alternative.name, tooltip: alternative.name }}
              accessories={
                alternative.active
                  ? [
                      {
                        icon: { source: Icon.CheckCircle, tintColor: Color.Green },
                        tooltip: alternativesViewStrings.activeAlternative,
                      },
                    ]
                  : []
              }
              detail={
                <List.Item.Detail
                  markdown={detailMarkdown(alternative)}
                  metadata={
                    <List.Item.Detail.Metadata>
                      {alternative.active ? (
                        <List.Item.Detail.Metadata.Label
                          title={alternativesViewStrings.activeAlternative}
                          icon={{ source: Icon.CheckCircle, tintColor: Color.Green }}
                        />
                      ) : (
                        <List.Item.Detail.Metadata.Label title={alternativesViewStrings.activeAlternative} text="" />
                      )}
                      <List.Item.Detail.Metadata.Separator />
                      <List.Item.Detail.Metadata.Label title={strings.key} text={alternative.key ?? ""} />
                      <List.Item.Detail.Metadata.Label
                        title={strings.bpm}
                        text={alternative.bpm === null ? "" : String(alternative.bpm)}
                      />
                      <List.Item.Detail.Metadata.Label
                        title={strings.timeSignature}
                        text={alternative.timeSignature ?? ""}
                      />
                    </List.Item.Detail.Metadata>
                  }
                />
              }
              actions={
                <ActionPanel>
                  <ActionPanel.Section>
                    <Action
                      title={alternativesViewStrings.openInDaw}
                      icon={logicApp ? { fileIcon: logicApp.path } : Icon.Document}
                      onAction={() => handleOpen(alternative)}
                    />
                    <ShowInFinderAction path={path.dirname(alternative.metadataFile)} />
                    {!alternative.active && (
                      <Action
                        title={alternativesViewStrings.setActive}
                        icon={Icon.CheckCircle}
                        onAction={() => handleSetActive(alternative)}
                      />
                    )}
                    <Action.Push
                      title={alternativesViewStrings.renameAlternative}
                      icon={Icon.Pencil}
                      shortcut={Keyboard.Shortcut.Common.Edit}
                      target={<RenameAlternativeForm alternative={alternative} onRenamed={reload} />}
                    />
                    <Action
                      title={alternativesViewStrings.duplicateAlternative}
                      icon={Icon.Duplicate}
                      shortcut={Keyboard.Shortcut.Common.Duplicate}
                      onAction={() => handleDuplicate(alternative)}
                    />
                  </ActionPanel.Section>
                  <ActionPanel.Section title={strings.sectionCopy}>
                    <Action.CopyToClipboard
                      content={alternative.name}
                      title={alternativesViewStrings.copyAlternativeName}
                      icon={Icon.CopyClipboard}
                      shortcut={Keyboard.Shortcut.Common.CopyName}
                    />
                    <Action.CopyToClipboard
                      content={alternative.path}
                      title={strings.copyProjectPath}
                      icon={Icon.CopyClipboard}
                      shortcut={Keyboard.Shortcut.Common.CopyPath}
                    />
                  </ActionPanel.Section>
                  <ActionPanel.Section title={strings.sectionArrange}>
                    <GroupBySubmenu allowed={["modified", "created"]} value={groupBy} onChange={setGroupBy} />
                    <SortBySubmenu allowed={ALTERNATIVES_SORT_OPTIONS} value={sortBy} onChange={setSortBy} />
                  </ActionPanel.Section>
                  <ActionPanel.Section title={strings.sectionDangerZone}>
                    <Action
                      title={strings.moveToTrash}
                      icon={Icon.Trash}
                      style={Action.Style.Destructive}
                      shortcut={Keyboard.Shortcut.Common.Remove}
                      onAction={() => handleTrash(alternative)}
                    />
                  </ActionPanel.Section>
                </ActionPanel>
              }
            />
          ))}
        </List.Section>
      ))}
    </List>
  );
}
