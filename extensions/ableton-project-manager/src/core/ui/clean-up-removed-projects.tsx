import { Action, ActionPanel, Alert, Color, confirmAlert, Icon, Keyboard, List, showToast, Toast } from "@raycast/api";
import { useEffect, useState } from "react";
import { getSettings } from "@/settings";
import { getTranslations } from "@/i18n";
import { removedProjectIds } from "@/core/fs/removed-projects";
import { deleteProjectMetadata, getAllProjectMetadata } from "@/core/metadata/project-metadata";
import { removeProjectFromAllOrders } from "@/core/metadata/collection-order";
import { removeProjectFromAllRoles } from "@/core/metadata/collection-roles";
import { archiveDeletedProject } from "@/core/fs/deleted-projects";

const settings = getSettings();
const t = getTranslations(settings.language);
const PROJECTS_ROOT = settings.projectsFolder;

// 手动清理「孤儿」数据：metadata 里还存着、但项目文件夹已不在根目录里的项目。
// 没有完全磁盘访问权限时的安全兜底——由用户亲自确认，不会把「移走」误判成「删除」。
export function CleanUpRemovedProjects() {
  const [removedIds, setRemovedIds] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  async function reload() {
    setIsLoading(true);
    const store = await getAllProjectMetadata();
    const removed = removedProjectIds(PROJECTS_ROOT, Object.keys(store));
    if (!removed) {
      // 根目录读不到（如外接盘未连接）：不确定，不把一切都当成已移除。
      setRemovedIds([]);
      setIsLoading(false);
      await showToast({ style: Toast.Style.Failure, title: t.manyProjectsMissing, message: t.manyProjectsMissingHint });
      return;
    }
    setRemovedIds(removed);
    setIsLoading(false);
  }

  useEffect(() => {
    void reload();
  }, []);

  // 与 Move to Trash 的清理顺序一致：归档（含笔记）→ 清元数据 → 清轨号 → 清角色。
  // 文件夹已不在、拿不到创建时间/inode，用 0 占位；无权限场景本就无法走废纸篓放回，笔记仍保留在 Deleted Projects/。
  async function cleanUp(ids: string[]) {
    for (const id of ids) {
      await archiveDeletedProject({ id, title: id, createdAt: 0 });
      await deleteProjectMetadata(id);
      await removeProjectFromAllOrders(id);
      await removeProjectFromAllRoles(id);
    }
    await reload();
    await showToast({ style: Toast.Style.Success, title: t.cleanedUp, message: String(ids.length) });
  }

  async function confirmAndClean(ids: string[], label: string) {
    const confirmed = await confirmAlert({
      icon: { source: Icon.Trash, tintColor: Color.Red },
      title: t.cleanUpRemovedConfirmTitle,
      message: `${t.cleanUpRemovedConfirmMessage}\n${label}`,
      primaryAction: { title: t.cleanUp, style: Alert.ActionStyle.Destructive },
    });
    if (!confirmed) return;
    await cleanUp(ids);
  }

  return (
    <List isLoading={isLoading} navigationTitle={t.cleanUpLeftovers} searchBarPlaceholder={t.searchLeftovers}>
      <List.EmptyView icon={Icon.CheckCircle} title={t.noRemovedProjects} />
      {removedIds.map((id) => (
        <List.Item
          key={id}
          icon="icon.png"
          title={id}
          accessories={[{ text: t.removedNotOnDisk }]}
          actions={
            <ActionPanel>
              <Action
                title={t.cleanUp}
                icon={Icon.Trash}
                style={Action.Style.Destructive}
                shortcut={Keyboard.Shortcut.Common.Remove}
                onAction={() => confirmAndClean([id], id)}
              />
              <Action
                title={t.cleanUpAll}
                icon={Icon.Trash}
                style={Action.Style.Destructive}
                shortcut={Keyboard.Shortcut.Common.RemoveAll}
                onAction={() => confirmAndClean(removedIds, t.cleanUpAll)}
              />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
