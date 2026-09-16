import {
  List,
  ActionPanel,
  Action,
  showToast,
  Toast,
  Icon,
  Color,
  closeMainWindow,
  Keyboard,
  LocalStorage,
  confirmAlert,
  Alert,
} from "@raycast/api";
import { useState, useEffect, useMemo, useCallback } from "react";

import type { ProjectItem } from "./providers/types";
import { allProviders, getProviderById } from "./providers/registry";
import {
  loadProjectsFromProvider,
  mergeProjects,
  removePathsFromAllDatabases,
  type RemovalReport,
} from "./utils/db";
import { formatOpenCommand, runOpenCommand } from "./utils/exec";

// 隐藏项目的 LocalStorage Key
const HIDDEN_PATHS_STORAGE_KEY = "hidden_recents_paths";

// GitHub Dark Theme 色彩配置
const GITHUB_COLORS = {
  blue: "#58A6FF",
  green: "#3FB950",
  purple: "#A371F7",
  yellow: "#D29922",
  gray: "#8B949E",
};

// 为常见已注册 IDE 分配便捷快捷键
const IDE_SHORTCUTS: Record<string, Keyboard.Shortcut> = {
  vscode: { modifiers: ["cmd"], key: "1" },
  trae: { modifiers: ["cmd"], key: "2" },
  antigravity: { modifiers: ["cmd"], key: "3" },
};

export default function Command() {
  const [projects, setProjects] = useState<ProjectItem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [errorDetails, setErrorDetails] = useState<string | null>(null);
  const [filterMode, setFilterMode] = useState<string>("all");

  // 加载数据及已隐藏路径
  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      // 获取用户已忽略/隐藏的路径
      const hiddenRaw = await LocalStorage.getItem<string>(
        HIDDEN_PATHS_STORAGE_KEY,
      );
      const hiddenSet = new Set<string>(hiddenRaw ? JSON.parse(hiddenRaw) : []);

      const allProjectLists: ProjectItem[] = [];

      for (const provider of allProviders) {
        const items = loadProjectsFromProvider(provider);
        allProjectLists.push(...items);
      }

      if (allProjectLists.length === 0) {
        throw new Error("未检测到任何 IDE 的最近项目数据");
      }

      const merged = mergeProjects(allProjectLists);
      // 过滤掉已加入黑名单的项目
      const filtered = merged.filter((p) => !hiddenSet.has(p.path));
      setProjects(filtered);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      setErrorDetails(message);
      showToast({
        style: Toast.Style.Failure,
        title: "读取最近项目失败",
        message,
      });
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // 统计失效项目数量
  const missingProjects = useMemo(
    () => projects.filter((p) => p.exists === false && p.type !== "remote"),
    [projects],
  );

  // 项目过滤：支持 全部 / 仅有效 / 仅失效 / 按 IDE 筛选
  const filteredProjects = useMemo(() => {
    if (filterMode === "all") return projects;
    if (filterMode === "valid_only") {
      return projects.filter((p) => p.exists !== false || p.type === "remote");
    }
    if (filterMode === "missing_only") {
      return projects.filter((p) => p.exists === false && p.type !== "remote");
    }
    // 按指定 IDE 过滤
    return projects.filter((p) => p.sources.includes(filterMode));
  }, [projects, filterMode]);

  // 检测实际有数据的 IDE
  const availableProviders = useMemo(() => {
    const sourceIds = new Set(projects.flatMap((p) => p.sources));
    return allProviders.filter((p) => sourceIds.has(p.id));
  }, [projects]);

  /**
   * 数据库清理失败时据实告知，并且不把项目从列表里隐藏 ——
   * 否则用户会以为记录已经删掉，而 IDE 里其实还在。
   */
  const reportRemovalFailure = (report: RemovalReport) => {
    showToast({
      style: Toast.Style.Failure,
      title: "未能从 IDE 数据库删除",
      message: report.failures
        .map((item) => `${item.providerName}: ${item.error}`)
        .join("；")
        .slice(0, 240),
    });
  };

  const hasBackupFailure = (report: RemovalReport) =>
    report.results.some((item) => item.backupFailures.length > 0);

  // 单项移除（隐藏或物理删除）
  const handleRemoveItem = async (
    item: ProjectItem,
    cleanFromDatabase: boolean,
  ) => {
    let removedFromDatabase = 0;
    let backupWarning = "";

    if (cleanFromDatabase) {
      const confirmed = await confirmAlert({
        title: `从 IDE 数据库中删除记录？`,
        message: `将从 VS Code / Trae / Antigravity 的数据库中物理删除 "${item.name}"，并自动保留 .bak 备份。`,
        primaryAction: {
          title: "确认删除",
          style: Alert.ActionStyle.Destructive,
        },
        dismissAction: {
          title: "取消",
        },
      });
      if (!confirmed) return;

      const report = removePathsFromAllDatabases(allProviders, [item.path]);
      if (report.failures.length > 0) {
        reportRemovalFailure(report);
        return;
      }

      removedFromDatabase = report.totalRemoved;
      backupWarning = hasBackupFailure(report)
        ? "（部分库未生成 .bak 备份）"
        : "";
    }

    // 保存到 LocalStorage 黑名单
    const hiddenRaw = await LocalStorage.getItem<string>(
      HIDDEN_PATHS_STORAGE_KEY,
    );
    const hiddenList: string[] = hiddenRaw ? JSON.parse(hiddenRaw) : [];
    if (!hiddenList.includes(item.path)) {
      hiddenList.push(item.path);
      await LocalStorage.setItem(
        HIDDEN_PATHS_STORAGE_KEY,
        JSON.stringify(hiddenList),
      );
    }

    setProjects((prev) => prev.filter((p) => p.path !== item.path));

    showToast({
      style: Toast.Style.Success,
      title: cleanFromDatabase
        ? removedFromDatabase > 0
          ? `已从 IDE 数据库删除 ${removedFromDatabase} 条记录${backupWarning}`
          : "IDE 数据库中已无该记录，已从列表移除"
        : "已从列表中隐藏",
      message: item.name,
    });
  };

  // 批量清理所有失效（Missing）项目：物理删除或仅隐藏
  const handleBatchClearMissing = async (cleanFromDatabase: boolean) => {
    if (missingProjects.length === 0) {
      showToast({
        style: Toast.Style.Success,
        title: "没有发现失效项目",
        message: "当前列表所有本地项目均存在",
      });
      return;
    }

    const missingPaths = missingProjects.map((p) => p.path);
    let removedFromDatabase = 0;
    let backupWarning = "";

    if (cleanFromDatabase) {
      const confirmed = await confirmAlert({
        title: `彻底清理 ${missingProjects.length} 个失效项目？`,
        message: `将从 VS Code / Trae / Antigravity 的历史数据库中物理删除这些失效记录（已自动保留 .bak 备份），并从列表中移除。`,
        primaryAction: {
          title: "确认彻底清理",
          style: Alert.ActionStyle.Destructive,
        },
        dismissAction: {
          title: "取消",
        },
      });
      if (!confirmed) return;

      const report = removePathsFromAllDatabases(allProviders, missingPaths);
      if (report.failures.length > 0) {
        reportRemovalFailure(report);
        return;
      }

      removedFromDatabase = report.totalRemoved;
      backupWarning = hasBackupFailure(report)
        ? "（部分库未生成 .bak 备份）"
        : "";
    }

    const hiddenRaw = await LocalStorage.getItem<string>(
      HIDDEN_PATHS_STORAGE_KEY,
    );
    const hiddenList: string[] = hiddenRaw ? JSON.parse(hiddenRaw) : [];
    for (const p of missingPaths) {
      if (!hiddenList.includes(p)) hiddenList.push(p);
    }
    await LocalStorage.setItem(
      HIDDEN_PATHS_STORAGE_KEY,
      JSON.stringify(hiddenList),
    );

    setProjects((prev) => prev.filter((p) => !missingPaths.includes(p.path)));

    showToast({
      style: Toast.Style.Success,
      title: cleanFromDatabase
        ? removedFromDatabase > 0
          ? `已从 IDE 数据库删除 ${removedFromDatabase} 条记录${backupWarning}`
          : `已在列表中移除 ${missingPaths.length} 个失效项目`
        : `已在列表中隐藏 ${missingPaths.length} 个失效项目`,
      message: cleanFromDatabase
        ? "列表中已移除对应项目"
        : "仍保留在 IDE 的最近项目记录中",
    });
  };

  // 打开项目（带 IDE 选择及状态检查）
  const openProject = async (item: ProjectItem, ideId: string) => {
    const provider = getProviderById(ideId);
    if (!provider) return;

    // 本地路径且已被移动/删除时，给出明确提示
    if (item.type !== "remote" && item.exists === false) {
      showToast({
        style: Toast.Style.Failure,
        title: "项目路径不存在",
        message: `磁盘上未找到: ${item.path}`,
      });
      return;
    }

    // 逐条尝试：命令与路径以独立参数传入，不经过 shell
    let lastError = "";
    for (const command of provider.getOpenCommands(item.path)) {
      const result = await runOpenCommand(command);
      if (result.success) {
        showToast({
          style: Toast.Style.Success,
          title: `Opening in ${provider.name}...`,
        });
        await closeMainWindow();
        return;
      } else {
        lastError = result.error || "";
      }
    }

    showToast({
      style: Toast.Style.Failure,
      title: `Could not open in ${provider.name}`,
      message: lastError
        ? lastError.replace(/\n+/g, " ").slice(0, 100)
        : "Please verify CLI or App installation",
    });
  };

  // GitHub 风格：图标映射
  const getItemIcon = (item: ProjectItem) => {
    if (item.exists === false && item.type !== "remote") {
      return { source: Icon.ExclamationMark, tintColor: Color.Red };
    }
    if (item.type === "remote") {
      return { source: Icon.Globe, tintColor: GITHUB_COLORS.green };
    }
    if (item.type === "workspace") {
      return { source: Icon.Box, tintColor: GITHUB_COLORS.purple };
    }
    if (item.type === "folder") {
      return { source: Icon.Folder, tintColor: GITHUB_COLORS.blue };
    }

    switch (item.extension) {
      case "ts":
      case "tsx":
        return { source: Icon.CodeBlock, tintColor: GITHUB_COLORS.blue };
      case "js":
      case "jsx":
        return { source: Icon.CodeBlock, tintColor: GITHUB_COLORS.yellow };
      case "json":
        return { source: Icon.Gear, tintColor: GITHUB_COLORS.gray };
      case "md":
        return { source: Icon.Document, tintColor: Color.PrimaryText };
      case "py":
        return { source: Icon.Code, tintColor: GITHUB_COLORS.green };
      default:
        return { source: Icon.Document, tintColor: GITHUB_COLORS.gray };
    }
  };

  // 标签名称映射
  const getBadgeText = (item: ProjectItem) => {
    switch (item.type) {
      case "remote":
        return "Remote";
      case "workspace":
        return "Workspace";
      case "folder":
        return "Directory";
      case "file":
        return item.extension ? `.${item.extension}` : "File";
      default:
        return "Repository";
    }
  };

  // 为项目获取来源 IDE 的 accessory tags
  const getSourceTags = (item: ProjectItem) => {
    const tags: List.Item.Accessory[] = [];

    // 若本地文件不存在，显式标记 Missing
    if (item.exists === false && item.type !== "remote") {
      tags.push({
        tag: {
          value: "Missing",
          color: Color.Red,
        },
        tooltip: "文件或路径在本地磁盘已不存在",
      });
    }

    // 类型标签
    tags.push({
      tag: {
        value: getBadgeText(item),
        color:
          item.type === "workspace"
            ? GITHUB_COLORS.purple
            : item.type === "remote"
              ? GITHUB_COLORS.green
              : GITHUB_COLORS.gray,
      },
    });

    // IDE 来源标签
    for (const sourceId of item.sources) {
      const provider = getProviderById(sourceId);
      if (provider) {
        tags.push({
          tag: {
            value: provider.name,
            color: provider.color,
          },
        });
      }
    }

    return tags;
  };

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder="Search projects across IDEs..."
      searchBarAccessory={
        <List.Dropdown
          tooltip="Filter Projects"
          storeValue
          onChange={setFilterMode}
        >
          <List.Dropdown.Section title="Status">
            <List.Dropdown.Item
              title={`All Projects (${projects.length})`}
              value="all"
            />
            <List.Dropdown.Item
              title={`Active Projects (${projects.length - missingProjects.length})`}
              value="valid_only"
              icon={Icon.CheckCircle}
            />
            {missingProjects.length > 0 && (
              <List.Dropdown.Item
                title={`Missing Projects (${missingProjects.length})`}
                value="missing_only"
                icon={{ source: Icon.ExclamationMark, tintColor: Color.Red }}
              />
            )}
          </List.Dropdown.Section>

          {availableProviders.length > 0 && (
            <List.Dropdown.Section title="Filter by IDE">
              {availableProviders.map((p) => (
                <List.Dropdown.Item key={p.id} title={p.name} value={p.id} />
              ))}
            </List.Dropdown.Section>
          )}
        </List.Dropdown>
      }
    >
      {errorDetails ? (
        <List.EmptyView
          icon={Icon.ExclamationMark}
          title="Failed to load projects"
          description={errorDetails}
        />
      ) : (
        filteredProjects.map((item) => {
          // 确定默认优先 IDE：如果来自多个 IDE，优先当前首个来源；否则使用第一个已注册 IDE
          const primaryProviderId = item.sources[0] || allProviders[0].id;
          const primaryProvider =
            getProviderById(primaryProviderId) || allProviders[0];

          // 复制到剪贴板的命令按主 IDE 生成，并按 shell 规则转义路径
          const primaryCommand = primaryProvider.getOpenCommands(item.path)[0];
          const terminalCommand = primaryCommand
            ? formatOpenCommand(primaryCommand)
            : item.path;

          return (
            <List.Item
              key={item.id}
              icon={getItemIcon(item)}
              title={item.name}
              subtitle={item.path}
              accessories={getSourceTags(item)}
              actions={
                <ActionPanel title="Project Actions">
                  {/* 默认主 Action：按回车直接使用最近来源 IDE 打开 */}
                  <Action
                    title={`Open in ${primaryProvider.name}`}
                    icon={Icon.Terminal}
                    onAction={() => openProject(item, primaryProvider.id)}
                  />

                  {/* 按 Cmd+K 打开 ActionPanel 时，展示所有已注册的 IDE 供用户自由选择 */}
                  <ActionPanel.Section title="Open With IDE">
                    {allProviders.map((provider) => {
                      const isRecentSource = item.sources.includes(provider.id);
                      return (
                        <Action
                          key={provider.id}
                          title={`Open in ${provider.name}${isRecentSource ? " (Recent)" : ""}`}
                          icon={Icon.Code}
                          shortcut={IDE_SHORTCUTS[provider.id]}
                          onAction={() => openProject(item, provider.id)}
                        />
                      );
                    })}
                  </ActionPanel.Section>

                  {/* 针对偏好子菜单的用户提供 Submenu 交互 */}
                  <ActionPanel.Submenu
                    title="Open in Another IDE..."
                    icon={Icon.AppWindowGrid3x3}
                  >
                    {allProviders.map((provider) => (
                      <Action
                        key={provider.id}
                        title={`Open in ${provider.name}`}
                        icon={Icon.Code}
                        onAction={() => openProject(item, provider.id)}
                      />
                    ))}
                  </ActionPanel.Submenu>

                  <ActionPanel.Section title="Actions">
                    {item.exists !== false && item.type !== "remote" && (
                      <Action.ShowInFinder path={item.path} />
                    )}
                    <Action.CopyToClipboard
                      title="Copy Path"
                      content={item.path}
                      shortcut={{ modifiers: ["cmd"], key: "c" }}
                    />
                    <Action.CopyToClipboard
                      title="Copy Terminal Command"
                      content={terminalCommand}
                      shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
                    />
                  </ActionPanel.Section>

                  {/* 清理与维护功能 */}
                  {missingProjects.length > 0 && (
                    <ActionPanel.Section title="Maintenance">
                      <Action
                        title={`Clear All Missing from IDEs & List (${missingProjects.length})`}
                        icon={Icon.Trash}
                        style={Action.Style.Destructive}
                        shortcut={{
                          modifiers: ["cmd", "shift"],
                          key: "backspace",
                        }}
                        onAction={() => handleBatchClearMissing(true)}
                      />
                      <Action
                        title={`Hide All Missing from List (${missingProjects.length})`}
                        icon={Icon.EyeDisabled}
                        shortcut={{
                          modifiers: ["cmd", "opt"],
                          key: "backspace",
                        }}
                        onAction={() => handleBatchClearMissing(false)}
                      />
                    </ActionPanel.Section>
                  )}

                  <ActionPanel.Section title="Manage Item">
                    <Action
                      title="Remove from List (Hide)"
                      icon={Icon.EyeDisabled}
                      shortcut={{ modifiers: ["cmd"], key: "backspace" }}
                      onAction={() => handleRemoveItem(item, false)}
                    />
                    <Action
                      title="Delete from IDE Database"
                      icon={Icon.Trash}
                      style={Action.Style.Destructive}
                      onAction={() => handleRemoveItem(item, true)}
                    />
                  </ActionPanel.Section>
                </ActionPanel>
              }
            />
          );
        })
      )}
    </List>
  );
}
