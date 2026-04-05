import {
  List,
  ActionPanel,
  Action,
  Icon,
  getPreferenceValues,
  Keyboard,
  showToast,
  Toast,
  popToRoot,
} from "@raycast/api";
import { useState, useEffect, useCallback } from "react";
import { Project, ProjectStates } from "./types";
import {
  loadProjects,
  sortProjects,
  shortenPath,
  fuzzyMatchScore,
} from "./projects";
import {
  loadProjectStates,
  togglePin,
  toggleFavorite,
  recordProjectUsage,
} from "./storage";
import { getAllCommands, executeCommand } from "./commands";

/**
 * Search Projects 主命令
 * 展示项目列表，支持搜索、操作、置顶/收藏
 */
export default function SearchProjects() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [states, setStates] = useState<ProjectStates>({});
  const [isLoading, setIsLoading] = useState(true);
  const [searchText, setSearchText] = useState("");

  const prefs = getPreferenceValues<{
    scanDirectories: string;
    customCommands?: string;
  }>();

  // 获取全部命令（内置 + 自定义）
  const commands = getAllCommands(prefs.customCommands);

  /**
   * 加载项目列表和状态
   */
  const refreshProjects = useCallback(async () => {
    setIsLoading(true);
    const savedStates = await loadProjectStates();
    setStates(savedStates);
    const allProjects = loadProjects(savedStates);
    setProjects(allProjects);
    setIsLoading(false);
  }, []);

  useEffect(() => {
    refreshProjects();
  }, [refreshProjects]);

  // 过滤并按搜索关键字评分排序
  const getFilteredProjects = useCallback(() => {
    if (!searchText) return projects;

    return projects
      .map((project) => {
        const nameScore = fuzzyMatchScore(searchText, project.name);
        // 路径的权重降低，优先匹配名称
        const pathScore = fuzzyMatchScore(searchText, project.path) * 0.5;
        // 如果名称匹配，基础分加很多，确保靠前
        const finalScore = nameScore > 0 ? nameScore * 2 : pathScore;
        return { project, score: finalScore };
      })
      .filter((item) => item.score > 0)
      .sort((a, b) => b.score - a.score)
      .map((item) => item.project);
  }, [projects, searchText]);

  const filteredProjects = getFilteredProjects();

  // 按置顶/收藏/普通分组排序
  const { pinned, favorited, normal } = sortProjects(
    filteredProjects,
    !!searchText,
  );

  /**
   * 处理置顶切换
   */
  const handleTogglePin = useCallback(
    async (projectId: string) => {
      const newStates = await togglePin(states, projectId);
      setStates(newStates);
      // 使用新状态重新加载项目
      const allProjects = loadProjects(newStates);
      setProjects(allProjects);
      await showToast({ style: Toast.Style.Success, title: "已更新置顶状态" });
    },
    [states],
  );

  /**
   * 处理收藏切换
   */
  const handleToggleFavorite = useCallback(
    async (projectId: string) => {
      const newStates = await toggleFavorite(states, projectId);
      setStates(newStates);
      const allProjects = loadProjects(newStates);
      setProjects(allProjects);
      await showToast({ style: Toast.Style.Success, title: "已更新收藏状态" });
    },
    [states],
  );

  /**
   * 处理命令执行
   */
  const handleExecuteCommand = useCallback(
    async (commandId: string, project: Project) => {
      const cmd = commands.find((c) => c.id === commandId);
      if (!cmd) return;

      // 记录使用频率
      const newStates = await recordProjectUsage(states, project.id);
      setStates(newStates);

      await executeCommand(cmd, project.path);
      await popToRoot();
    },
    [commands, states],
  );

  /**
   * 渲染单个项目行
   */
  const renderProjectItem = (project: Project) => {
    // 状态标记
    const accessories: List.Item.Accessory[] = [];
    if (project.isPinned) {
      accessories.push({ icon: Icon.Pin, tooltip: "已置顶" });
    }
    if (project.isFavorite) {
      accessories.push({ icon: Icon.Star, tooltip: "已收藏" });
    }

    return (
      <List.Item
        key={project.id}
        title={project.name}
        subtitle={shortenPath(project.path)}
        accessories={accessories}
        actions={
          <ActionPanel>
            {/* IDE/工具操作 */}
            <ActionPanel.Section title="打开项目">
              {commands.map((cmd) => (
                <Action
                  key={cmd.id}
                  title={cmd.label}
                  icon={cmd.icon}
                  shortcut={
                    cmd.shortcut
                      ? ({
                          modifiers: cmd.shortcut
                            .modifiers as Keyboard.KeyModifier[],
                          key: cmd.shortcut.key as Keyboard.KeyEquivalent,
                        } as Keyboard.Shortcut)
                      : undefined
                  }
                  onAction={() => handleExecuteCommand(cmd.id, project)}
                />
              ))}
            </ActionPanel.Section>

            {/* 管理操作 */}
            <ActionPanel.Section title="管理">
              <Action
                title={project.isPinned ? "取消置顶" : "置顶"}
                icon={Icon.Pin}
                shortcut={{ modifiers: ["cmd", "shift"], key: "p" }}
                onAction={() => handleTogglePin(project.id)}
              />
              <Action
                title={project.isFavorite ? "取消收藏" : "收藏"}
                icon={Icon.Star}
                shortcut={{ modifiers: ["cmd", "shift"], key: "f" }}
                onAction={() => handleToggleFavorite(project.id)}
              />
              <Action
                title="重新扫描项目"
                icon={Icon.ArrowClockwise}
                shortcut={{ modifiers: ["cmd", "shift"], key: "r" }}
                onAction={async () => {
                  await showToast({
                    style: Toast.Style.Animated,
                    title: "正在扫描项目...",
                  });
                  await refreshProjects();
                  await showToast({
                    style: Toast.Style.Success,
                    title: "扫描完成",
                  });
                }}
              />
              <Action.CopyToClipboard
                title="复制路径"
                content={project.path}
                shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
              />
              <Action.Open
                title="在 Finder 中打开"
                target={project.path}
                shortcut={{ modifiers: ["cmd", "shift"], key: "o" }}
              />
            </ActionPanel.Section>
          </ActionPanel>
        }
      />
    );
  };

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder="搜索项目..."
      searchText={searchText}
      onSearchTextChange={setSearchText}
      filtering={false}
      actions={
        <ActionPanel>
          <Action
            title="重新扫描项目"
            icon={Icon.ArrowClockwise}
            shortcut={{ modifiers: ["cmd", "shift"], key: "r" }}
            onAction={async () => {
              await showToast({
                style: Toast.Style.Animated,
                title: "正在扫描项目...",
              });
              await refreshProjects();
              await showToast({
                style: Toast.Style.Success,
                title: "扫描完成",
              });
            }}
          />
        </ActionPanel>
      }
    >
      {/* 置顶项目 */}
      {pinned.length > 0 && (
        <List.Section title="📌 置顶" subtitle={`${pinned.length} 个项目`}>
          {pinned.map(renderProjectItem)}
        </List.Section>
      )}

      {/* 收藏项目 */}
      {favorited.length > 0 && (
        <List.Section title="★ 收藏" subtitle={`${favorited.length} 个项目`}>
          {favorited.map(renderProjectItem)}
        </List.Section>
      )}

      {/* 普通项目 */}
      <List.Section title="全部项目" subtitle={`${normal.length} 个项目`}>
        {normal.map(renderProjectItem)}
      </List.Section>
    </List>
  );
}
