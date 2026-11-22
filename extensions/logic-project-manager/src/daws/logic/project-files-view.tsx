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
  trash,
  useNavigation,
} from "@raycast/api";
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { useEffect, useState } from "react";
import type { DawSet, ProjectFileMetadata } from "@/daws";
import { lastSavedAt, listPackages, logicAdapter } from "./adapter";
import {
  EMPTY_METADATA,
  cachedSetMetadata,
  loadPersistentProjectFileCache,
  parseSetMetadata,
} from "@/core/projects/project-file-cache";
import { SortBySubmenu } from "@/core/ui/actions/sort-by-submenu";
import { useSortOption } from "@/core/ui/hooks/use-sort-option";
import { sortItems, sortOptionTitle } from "@/core/ui/shared/sorting";
import type { SortOption } from "@/core/ui/shared/sorting";
import { GroupBySubmenu } from "@/core/ui/actions/group-by-submenu";
import { useGroupOption } from "@/core/ui/hooks/use-group-option";
import { groupItems } from "@/core/ui/shared/grouping";
import { strings } from "@/strings";
import type { Project } from "@/core/projects/types";
import { LOG_PREFIX } from "@/core/log";
import { alternativesViewStrings, projectFilesViewStrings } from "./strings";
import { openWithDaw } from "@/core/daw-app";
import { useDawApp } from "@/core/ui/hooks/use-daw-app";
import { showFailure } from "@/core/ui/shared/toast";
import { ShowInFinderAction } from "@/core/ui/actions/show-in-finder";
import { labels } from "@/daws/labels";
import { AlternativesView, findWindowImage } from "./alternatives-view";

const PROJECT_FILES_SORT_STORAGE_KEY = "project-files-sort-option";
const PROJECT_FILES_GROUP_STORAGE_KEY = "project-files-group-option";

const PROJECT_FILES_SORT_OPTIONS: SortOption[] = [
  "modified-desc",
  "modified-asc",
  "created-desc",
  "created-asc",
  "name-asc",
  "name-desc",
];

const PACKAGE_SUFFIX = ".logicx";
// 结尾的 .logicx（不区分大小写），用于去掉用户顺手输入的后缀。
const PACKAGE_SUFFIX_PATTERN = /\.logicx$/i;

// 文件夹里的一个 .logicx。缩略图和元数据取它的 Active Alternative。
// modifiedAt 是最后一次保存的时间（各 Alternative 里 ProjectData 的最新修改时间），和 ⌘O 选「最新」用的是同一个。
type ProjectFile = ProjectFileMetadata & {
  packagePath: string;
  name: string;
  createdAt: number;
  modifiedAt: number;
  alternativeCount: number;
  active: DawSet | null;
  windowImage: string | null;
};

function uniqueCopyPath(dir: string, baseName: string): string {
  let candidate = path.join(dir, `${baseName} copy${PACKAGE_SUFFIX}`);
  let counter = 2;
  while (fs.existsSync(candidate)) {
    candidate = path.join(dir, `${baseName} copy ${counter}${PACKAGE_SUFFIX}`);
    counter++;
  }
  return candidate;
}

// 两个路径是否指向同一个文件（只改大小写时，在不区分大小写的卷上为 true）。
function isSameFile(a: string, b: string): boolean {
  try {
    const sa = fs.statSync(a);
    const sb = fs.statSync(b);
    return sa.ino === sb.ino && sa.dev === sb.dev;
  } catch {
    return false;
  }
}

function RenameProjectFileForm({ file, onRenamed }: { file: ProjectFile; onRenamed: () => void }) {
  const { pop } = useNavigation();
  const [name, setName] = useState(file.name);

  async function handleSubmit() {
    // 用户顺手输了 .logicx 也接受，统一由这里补后缀。
    const trimmed = name.trim().replace(PACKAGE_SUFFIX_PATTERN, "");
    if (trimmed === "" || trimmed === file.name) {
      pop();
      return;
    }
    if (trimmed.includes("/") || trimmed.includes(":")) {
      await showToast({ style: Toast.Style.Failure, title: strings.invalidName });
      return;
    }

    const target = path.join(path.dirname(file.packagePath), `${trimmed}${PACKAGE_SUFFIX}`);
    // 目标已存在且不是它自己（只改大小写）时拦下，绝不覆盖另一个 .logicx。
    if (fs.existsSync(target) && !isSameFile(target, file.packagePath)) {
      await showToast({ style: Toast.Style.Failure, title: projectFilesViewStrings.projectFileNameExists });
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
      fs.renameSync(file.packagePath, target);
    } catch (error) {
      await showFailure(strings.renameFailed, error);
      return;
    }

    onRenamed();
    await showToast({
      style: Toast.Style.Success,
      title: projectFilesViewStrings.projectFileRenamed,
      message: `${trimmed}${PACKAGE_SUFFIX}`,
    });
    pop();
  }

  return (
    <Form
      navigationTitle={`${projectFilesViewStrings.renameProjectFile} — ${file.name}`}
      actions={
        <ActionPanel>
          <Action.SubmitForm title={strings.save} onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField id="name" title={strings.name} value={name} onChange={setName} />
    </Form>
  );
}

// 文件夹形态的项目里有多个 .logicx 时的列表，对应 APM 的 View Sets：Enter 直接用 Logic 打开这个 .logicx，
// ⌘↵ 进它的 Alternatives（只有一个 Alternative 也能进，用来设为 Active、重命名、复制）。
export function ProjectFilesView({ project }: { project: Project }) {
  const [files, setFiles] = useState<ProjectFile[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const logicApp = useDawApp();
  const [sortBy, setSortBy] = useSortOption(PROJECT_FILES_SORT_STORAGE_KEY, PROJECT_FILES_SORT_OPTIONS, "created-desc");
  const [groupBy, setGroupBy] = useGroupOption(PROJECT_FILES_GROUP_STORAGE_KEY, "created");
  const [reloadToken, setReloadToken] = useState(0);

  useEffect(() => {
    let cancelled = false;

    async function loadFiles() {
      try {
        await loadPersistentProjectFileCache();
        if (cancelled) return;

        const items: ProjectFile[] = [];
        for (const packagePath of listPackages(project.folderPath)) {
          const sets = logicAdapter.listSets({ folderPath: packagePath, kind: "package" });
          const active = sets.find((set) => set.active) ?? null;
          let metadata = EMPTY_METADATA;
          if (active) {
            const cached = cachedSetMetadata(active);
            metadata = cached ?? EMPTY_METADATA;
            if (!cached) {
              try {
                metadata = await parseSetMetadata(active);
              } catch (error) {
                console.error(`${LOG_PREFIX} Failed to load project file metadata: ${active.metadataFile}`, error);
              }
            }
          }
          if (cancelled) return;

          let createdAt = 0;
          try {
            createdAt = fs.statSync(packagePath).birthtimeMs;
          } catch {
            // 读不到就按 0，排到最旧。
          }
          // 一个 Alternative 都读不到保存时间时，按创建时间算，免得分组里出现无效日期。
          const savedAt = lastSavedAt(packagePath);
          items.push({
            ...metadata,
            packagePath,
            name: logicAdapter.projectIdForEntry(path.basename(packagePath)),
            createdAt,
            modifiedAt: Number.isFinite(savedAt) ? savedAt : createdAt,
            alternativeCount: sets.length,
            active,
            windowImage: active ? findWindowImage(active) : null,
          });
        }
        setFiles(items);
      } catch (error) {
        if (!cancelled) {
          console.error(`${LOG_PREFIX} Failed to load project files:`, error);
          setFiles([]);
        }
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }

    void loadFiles();

    return () => {
      cancelled = true;
    };
  }, [project.folderPath, reloadToken]);

  const reload = () => setReloadToken((n) => n + 1);

  const handleOpen = async (file: ProjectFile) => {
    try {
      await openWithDaw(file.packagePath);
      await closeMainWindow();
    } catch (error) {
      await showFailure(labels.openSetFailed, error);
    }
  };

  const handleDuplicate = async (file: ProjectFile) => {
    try {
      const target = uniqueCopyPath(path.dirname(file.packagePath), file.name);
      // 保留修改时间：不然副本会成为「最后保存」的那个，⌘O 会打开副本而不是用户正在做的版本。
      await fs.promises.cp(file.packagePath, target, {
        recursive: true,
        preserveTimestamps: true,
        errorOnExist: true,
        force: false,
      });
      reload();
      await showToast({
        style: Toast.Style.Success,
        title: projectFilesViewStrings.projectFileDuplicated,
        message: path.basename(target),
      });
    } catch (error) {
      await showFailure(strings.duplicateFailed, error);
    }
  };

  const handleTrash = async (file: ProjectFile) => {
    // 只剩一个 .logicx 时不让删：删掉后这个文件夹就不再算项目了。
    if (files.length <= 1) {
      await showToast({ style: Toast.Style.Failure, title: projectFilesViewStrings.lastProjectFile });
      return;
    }
    const confirmed = await confirmAlert({
      title: strings.moveToTrash,
      icon: Icon.Trash,
      message: `${projectFilesViewStrings.trashProjectFileHint}\n${file.name}\n\n${projectFilesViewStrings.trashConfirmMessage}`,
      primaryAction: { title: strings.moveToTrash, style: Alert.ActionStyle.Destructive },
    });
    if (!confirmed) return;
    try {
      await trash(file.packagePath);
      reload();
      await showToast({ style: Toast.Style.Success, title: strings.movedToTrash, message: file.name });
    } catch (error) {
      await showFailure(strings.trashFailed, error);
    }
  };

  const sortedFiles = sortItems(files, sortBy, (file) => ({
    created: file.createdAt,
    modified: file.modifiedAt,
    name: file.name,
  }));

  return (
    <List
      isLoading={isLoading}
      isShowingDetail
      navigationTitle={project.title}
      searchBarPlaceholder={projectFilesViewStrings.searchProjectFiles}
    >
      {groupItems(
        sortedFiles,
        groupBy,
        (file) => ({ created: file.createdAt, modified: file.modifiedAt }),
        sortOptionTitle(sortBy),
      ).map((group) => (
        <List.Section key={group.key} title={group.title} subtitle={group.subtitle}>
          {group.items.map((file) => (
            <List.Item
              key={file.packagePath}
              icon={file.windowImage ? { source: file.windowImage, mask: Image.Mask.RoundedRectangle } : "package.png"}
              title={{ value: file.name, tooltip: file.name }}
              detail={
                <List.Item.Detail
                  markdown={file.windowImage ? `![](${pathToFileURL(file.windowImage).href})` : ""}
                  metadata={
                    <List.Item.Detail.Metadata>
                      <List.Item.Detail.Metadata.Label title={labels.sets} text={String(file.alternativeCount)} />
                      <List.Item.Detail.Metadata.Label title={labels.currentSet} text={file.active?.name ?? ""} />
                      <List.Item.Detail.Metadata.Separator />
                      <List.Item.Detail.Metadata.Label title={strings.key} text={file.key ?? ""} />
                      <List.Item.Detail.Metadata.Label
                        title={strings.bpm}
                        text={file.bpm === null ? "" : String(file.bpm)}
                      />
                      <List.Item.Detail.Metadata.Label title={strings.timeSignature} text={file.timeSignature ?? ""} />
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
                      onAction={() => handleOpen(file)}
                    />
                    <Action.Push
                      title={labels.viewSets}
                      icon={Icon.Document}
                      shortcut={{ modifiers: ["cmd"], key: "return" }}
                      target={
                        <AlternativesView
                          project={{ ...project, title: file.name, folderPath: file.packagePath, kind: "package" }}
                        />
                      }
                      onPop={reload}
                    />
                    <ShowInFinderAction path={file.packagePath} />
                    <Action.Push
                      title={projectFilesViewStrings.renameProjectFile}
                      icon={Icon.Pencil}
                      shortcut={Keyboard.Shortcut.Common.Edit}
                      target={<RenameProjectFileForm file={file} onRenamed={reload} />}
                    />
                    <Action
                      title={projectFilesViewStrings.duplicateProjectFile}
                      icon={Icon.Duplicate}
                      shortcut={Keyboard.Shortcut.Common.Duplicate}
                      onAction={() => handleDuplicate(file)}
                    />
                  </ActionPanel.Section>
                  <ActionPanel.Section title={strings.sectionCopy}>
                    <Action.CopyToClipboard
                      content={path.basename(file.packagePath)}
                      title={projectFilesViewStrings.copyProjectFileName}
                      icon={Icon.CopyClipboard}
                      shortcut={Keyboard.Shortcut.Common.CopyName}
                    />
                    <Action.CopyToClipboard
                      content={file.packagePath}
                      title={strings.copyProjectPath}
                      icon={Icon.CopyClipboard}
                      shortcut={Keyboard.Shortcut.Common.CopyPath}
                    />
                  </ActionPanel.Section>
                  <ActionPanel.Section title={strings.sectionArrange}>
                    <GroupBySubmenu allowed={["modified", "created"]} value={groupBy} onChange={setGroupBy} />
                    <SortBySubmenu allowed={PROJECT_FILES_SORT_OPTIONS} value={sortBy} onChange={setSortBy} />
                  </ActionPanel.Section>
                  <ActionPanel.Section title={strings.sectionDangerZone}>
                    <Action
                      title={strings.moveToTrash}
                      icon={Icon.Trash}
                      style={Action.Style.Destructive}
                      shortcut={Keyboard.Shortcut.Common.Remove}
                      onAction={() => handleTrash(file)}
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
