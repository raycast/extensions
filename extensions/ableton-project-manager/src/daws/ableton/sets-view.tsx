import {
  ActionPanel,
  Action,
  Alert,
  Color,
  confirmAlert,
  Form,
  getApplications,
  Icon,
  Keyboard,
  List,
  showToast,
  Toast,
  trash,
  useNavigation,
  type Application,
} from "@raycast/api";
import { useEffect, useState } from "react";
import fs from "node:fs";
import path from "node:path";
import type { DawSet, ProjectFileMetadata } from "@/daws";
import { abletonAdapter, SET_EXTENSION } from "./adapter";
import {
  EMPTY_METADATA,
  cachedSetMetadata,
  loadPersistentProjectFileCache,
  parseSetMetadata,
} from "@/core/projects/project-file-cache";
import { SortBySubmenu, sortItems, sortOptionTitle, useSortOption } from "@/core/ui/sorting";
import type { SortOption } from "@/core/ui/sorting";
import { GroupBySubmenu, groupItems, useGroupOption } from "@/core/ui/grouping";
import { getSettings } from "@/settings";
import { getTranslations } from "@/i18n";
import type { Project } from "@/core/projects/types";
import { showFailure } from "@/core/ui/toast";
import { LOG_PREFIX } from "@/core/log";
import { getSetsViewStrings } from "./strings";

const settings = getSettings();
const t = getTranslations(settings.language);
const setsText = getSetsViewStrings(settings.language);

const SETS_SORT_STORAGE_KEY = "sets-sort-option";
const SETS_GROUP_STORAGE_KEY = "sets-group-option";

const SETS_SORT_OPTIONS: SortOption[] = [
  "modified-desc",
  "modified-asc",
  "created-desc",
  "created-asc",
  "name-asc",
  "name-desc",
];

type ProjectSet = DawSet & ProjectFileMetadata;

const METADATA_CONCURRENCY = 3;

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

// 结尾的工程后缀（不区分大小写），用于去掉用户顺手输入的后缀。
const SET_EXTENSION_PATTERN = new RegExp(escapeRegExp(SET_EXTENSION) + "$", "i");

function uniqueCopyPath(dir: string, baseName: string): string {
  let candidate = path.join(dir, `${baseName} copy${SET_EXTENSION}`);
  let counter = 2;
  while (fs.existsSync(candidate)) {
    candidate = path.join(dir, `${baseName} copy ${counter}${SET_EXTENSION}`);
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

function RenameSetForm({ set, onRenamed }: { set: ProjectSet; onRenamed: () => void }) {
  const { pop } = useNavigation();
  const [name, setName] = useState(set.name);

  async function handleSubmit() {
    // 用户顺手输了工程后缀也接受，统一由这里补后缀。
    const trimmed = name.trim().replace(SET_EXTENSION_PATTERN, "");
    if (trimmed === "" || trimmed === set.name) {
      pop();
      return;
    }
    if (trimmed.includes("/") || trimmed.includes(":")) {
      await showToast({ style: Toast.Style.Failure, title: t.invalidName });
      return;
    }

    const target = path.join(path.dirname(set.path), `${trimmed}${SET_EXTENSION}`);
    // 目标已存在且不是它自己（只改大小写）时拦下，绝不覆盖另一个 Set。
    if (fs.existsSync(target) && !isSameFile(target, set.path)) {
      await showToast({ style: Toast.Style.Failure, title: setsText.setNameExists });
      return;
    }

    const confirmed = await confirmAlert({
      icon: { source: Icon.Warning, tintColor: Color.Yellow },
      title: setsText.renameSetConfirmTitle,
      message: setsText.renameSetConfirmMessage,
      primaryAction: { title: t.rename, style: Alert.ActionStyle.Default },
    });
    if (!confirmed) return;

    try {
      fs.renameSync(set.path, target);
    } catch (error) {
      await showFailure(t.renameFailed, error);
      return;
    }

    onRenamed();
    await showToast({ style: Toast.Style.Success, title: setsText.setRenamed, message: `${trimmed}${SET_EXTENSION}` });
    pop();
  }

  return (
    <Form
      navigationTitle={`${setsText.renameSet} — ${set.name}`}
      actions={
        <ActionPanel>
          <Action.SubmitForm title={t.save} onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField id="name" title={t.name} value={name} onChange={setName} />
    </Form>
  );
}

export function SetsView({ project }: { project: Project }) {
  const [sets, setSets] = useState<ProjectSet[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [sortBy, setSortBy] = useSortOption(SETS_SORT_STORAGE_KEY, SETS_SORT_OPTIONS, "created-desc");
  const [groupBy, setGroupBy] = useGroupOption(SETS_GROUP_STORAGE_KEY, "created");
  const [abletonApp, setAbletonApp] = useState<Application | null>(null);
  const [reloadToken, setReloadToken] = useState(0);

  // 解析 Ableton Live，仅用于 Open in Ableton Live 的图标。
  useEffect(() => {
    void getApplications().then((apps) => {
      setAbletonApp(apps.find((app) => app.name.toLowerCase().includes(abletonAdapter.appNameMatch)) ?? null);
    });
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function loadSets() {
      try {
        await loadPersistentProjectFileCache();

        if (cancelled) return;

        // 有缓存的先显示，没缓存的再并发解析。
        const items = abletonAdapter.listSets(project).map((dawSet) => {
          const cached = cachedSetMetadata(dawSet);
          const set: ProjectSet = { ...dawSet, ...(cached ?? EMPTY_METADATA) };
          return { set, cached: cached !== null };
        });

        const missing = items.filter((item) => !item.cached);

        async function parseSet(set: ProjectSet) {
          try {
            const metadata = await parseSetMetadata(set);

            if (cancelled) return;

            set.bpm = metadata.bpm;
            set.timeSignature = metadata.timeSignature;
            set.key = metadata.key;
          } catch (error) {
            console.error(`${LOG_PREFIX} Failed to load set metadata: ${set.path}`, error);
          }
        }

        let nextIndex = 0;

        async function worker() {
          while (!cancelled) {
            const index = nextIndex++;
            if (index >= missing.length) return;

            await parseSet(missing[index].set);
          }
        }

        await Promise.all(Array.from({ length: Math.min(METADATA_CONCURRENCY, missing.length) }, () => worker()));

        if (cancelled) return;

        setSets(items.map((item) => item.set));
      } catch (error) {
        if (!cancelled) {
          console.error(`${LOG_PREFIX} Failed to load sets:`, error);
          setSets([]);
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }

    void loadSets();

    return () => {
      cancelled = true;
    };
  }, [project.folderPath, project.kind, reloadToken]);

  const handleDuplicate = async (set: ProjectSet) => {
    try {
      const target = uniqueCopyPath(path.dirname(set.path), set.name);
      fs.copyFileSync(set.path, target);
      setReloadToken((n) => n + 1);
      await showToast({ style: Toast.Style.Success, title: setsText.setDuplicated, message: path.basename(target) });
    } catch (error) {
      await showFailure(t.duplicateFailed, error);
    }
  };

  const handleTrash = async (set: ProjectSet) => {
    const confirmed = await confirmAlert({
      title: t.moveToTrash,
      icon: Icon.Trash,
      message: `${setsText.trashSetHint}\n${set.name}`,
      primaryAction: { title: t.moveToTrash, style: Alert.ActionStyle.Destructive },
    });
    if (!confirmed) return;
    try {
      await trash(set.path);
      setReloadToken((n) => n + 1);
      await showToast({ style: Toast.Style.Success, title: t.movedToTrash, message: set.name });
    } catch (error) {
      await showFailure(t.trashFailed, error);
    }
  };

  const sortedSets = sortItems(sets, sortBy, (set) => ({
    created: set.createdAt,
    modified: set.modifiedAt,
    name: set.name,
  }));

  return (
    <List
      isLoading={isLoading}
      isShowingDetail
      navigationTitle={project.title}
      searchBarPlaceholder={setsText.searchSets}
    >
      {groupItems(
        sortedSets,
        groupBy,
        (set) => ({ created: set.createdAt, modified: set.modifiedAt }),
        sortOptionTitle(sortBy),
      ).map((group) => (
        <List.Section key={group.key} title={group.title} subtitle={group.subtitle}>
          {group.items.map((set) => (
            <List.Item
              key={set.path}
              icon="set.png"
              title={set.name}
              detail={
                <List.Item.Detail
                  metadata={
                    <List.Item.Detail.Metadata>
                      <List.Item.Detail.Metadata.Label title="Key" text={set.key ?? ""} />
                      <List.Item.Detail.Metadata.Label title="BPM" text={set.bpm === null ? "" : String(set.bpm)} />
                      <List.Item.Detail.Metadata.Label title="Time Signature" text={set.timeSignature ?? ""} />
                    </List.Item.Detail.Metadata>
                  }
                />
              }
              actions={
                <ActionPanel>
                  <ActionPanel.Section>
                    <Action.Open
                      title={setsText.openInDaw}
                      icon={abletonApp ? { fileIcon: abletonApp.path } : Icon.Document}
                      target={set.path}
                    />
                    <Action.ShowInFinder
                      path={set.path}
                      title={t.showInFinder}
                      shortcut={{ modifiers: ["cmd", "opt"], key: "o" }}
                    />
                    <Action.Push
                      title={setsText.renameSet}
                      icon={Icon.Pencil}
                      shortcut={Keyboard.Shortcut.Common.Edit}
                      target={<RenameSetForm set={set} onRenamed={() => setReloadToken((n) => n + 1)} />}
                    />
                    <Action
                      title={setsText.duplicateSet}
                      icon={Icon.Duplicate}
                      shortcut={Keyboard.Shortcut.Common.Duplicate}
                      onAction={() => handleDuplicate(set)}
                    />
                  </ActionPanel.Section>
                  <ActionPanel.Section title={t.sectionCopy}>
                    <Action.CopyToClipboard
                      content={set.path.split("/").pop() ?? ""}
                      title={setsText.copySetName}
                      icon={Icon.CopyClipboard}
                      shortcut={Keyboard.Shortcut.Common.CopyName}
                    />
                    <Action.CopyToClipboard
                      content={set.path}
                      title={setsText.copySetPath}
                      icon={Icon.CopyClipboard}
                      shortcut={Keyboard.Shortcut.Common.CopyPath}
                    />
                  </ActionPanel.Section>
                  <ActionPanel.Section title={t.sectionArrange}>
                    <GroupBySubmenu allowed={["modified", "created"]} value={groupBy} onChange={setGroupBy} />
                    <SortBySubmenu allowed={SETS_SORT_OPTIONS} value={sortBy} onChange={setSortBy} />
                  </ActionPanel.Section>
                  <ActionPanel.Section title={t.sectionDangerZone}>
                    <Action
                      title={t.moveToTrash}
                      icon={Icon.Trash}
                      style={Action.Style.Destructive}
                      shortcut={Keyboard.Shortcut.Common.Remove}
                      onAction={() => handleTrash(set)}
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
