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
  useNavigation,
  Color,
} from "@raycast/api";
import { useState, useEffect, useCallback, useMemo } from "react";
import {
  Skill,
  SkillStates,
  ProjectState,
  ProjectStates,
  CommandDef,
  SkillInstallation,
  AgentConfig,
} from "./types";
import {
  loadSkills,
  sortSkills,
  fuzzyMatchScore,
  installSkillToProject,
  syncSkillToGlobal,
  syncSkillToAgentGlobal,
  getInstalledNonUniversalAgents,
  getInstalledAgents,
  AGENT_REGISTRY,
  expandPath,
  isSkillBackedUp,
  backupSkill,
  backupAllSkills,
} from "./skills";
import fs from "fs";
import path from "path";

function isSymlinkCheck(filePath: string): boolean {
  try {
    return fs.lstatSync(filePath).isSymbolicLink();
  } catch {
    return false;
  }
}
import {
  loadSkillStates,
  toggleSkillPin,
  toggleSkillFavorite,
  recordSkillUsage,
  loadProjectStates,
} from "./storage";
import { getAllCommands, executeCommand } from "./commands";
import { shortenPath, loadProjects } from "./projects";
import { Project } from "./types";

export default function ManageSkills() {
  const [skills, setSkills] = useState<Skill[]>([]);
  const [skillStates, setSkillStates] = useState<SkillStates>({});
  const [projectStates, setProjectStates] = useState<ProjectStates>({});
  const [isLoading, setIsLoading] = useState(true);
  const [searchText, setSearchText] = useState("");
  const [scopeFilter, setScopeFilter] = useState("all");
  const { push } = useNavigation();

  const prefs = getPreferenceValues<{
    globalSkillDirectory: string;
    customCommands?: string;
    backupDirectory?: string;
  }>();

  const backupDir = prefs.backupDirectory || "";

  const commands = getAllCommands(prefs.customCommands);

  const refreshSkills = useCallback(async () => {
    setIsLoading(true);
    try {
      const sStates = await loadSkillStates();
      const pStates = await loadProjectStates();
      setSkillStates(sStates);
      setProjectStates(pStates);
      const allSkills = loadSkills(
        prefs.globalSkillDirectory,
        sStates,
        pStates,
      );
      setSkills(allSkills);
    } catch (e) {
      console.error(e);
      await showToast({ style: Toast.Style.Failure, title: "加载技能失败" });
    } finally {
      setIsLoading(false);
    }
  }, [prefs.globalSkillDirectory]);

  useEffect(() => {
    refreshSkills();
  }, [refreshSkills]);

  const shortcutsTooltip = useMemo(() => {
    return commands
      .filter((cmd) => cmd.shortcut)
      .map((cmd) => {
        const mods = (cmd.shortcut!.modifiers as string[])
          .map((m) =>
            m === "cmd"
              ? "⌘"
              : m === "shift"
                ? "⇧"
                : m === "opt"
                  ? "⌥"
                  : m === "ctrl"
                    ? "⌃"
                    : m,
          )
          .join("");
        return `${mods}${cmd.shortcut!.key.toUpperCase()} - ${cmd.label}`;
      })
      .join("\n");
  }, [commands]);

  const sourceGroups = useMemo(() => {
    const globals: { id: string; name: string }[] = [];
    const projects: { id: string; name: string }[] = [];
    const seen = new Set();
    skills.forEach((s) => {
      s.installations.forEach((i) => {
        if (!seen.has(i.sourceGroupId)) {
          seen.add(i.sourceGroupId);
          if (i.sourceGroupId.startsWith("global:")) {
            globals.push({
              id: i.sourceGroupId,
              name: `🌐 Global: ${shortenPath(i.sourceGroupId.slice(7))}`,
            });
          } else {
            projects.push({
              id: i.sourceGroupId,
              name: `📦 Project: ${i.projectName || shortenPath(i.sourceGroupId.slice(8))}`,
            });
          }
        }
      });
    });
    return { globals, projects };
  }, [skills]);

  const getFilteredSkills = useCallback(() => {
    let scopedSkills = skills;
    if (scopeFilter !== "all") {
      scopedSkills = skills.filter((s) =>
        s.installations.some((i) => i.sourceGroupId === scopeFilter),
      );
    }

    if (!searchText) return scopedSkills;
    return scopedSkills
      .map((skill) => {
        const nameScore = fuzzyMatchScore(searchText, skill.name);
        const descScore = fuzzyMatchScore(searchText, skill.description) * 0.8;
        const finalScore = Math.max(nameScore * 2, descScore);
        return { skill, score: finalScore };
      })
      .filter((item) => item.score > 0)
      .sort((a, b) => b.score - a.score)
      .map((item) => item.skill);
  }, [skills, searchText, scopeFilter]);

  const filteredSkills = getFilteredSkills();
  const { pinned, favorited, normal } = sortSkills(
    filteredSkills,
    !!searchText,
  );

  const handleTogglePin = async (skillId: string) => {
    const newStates = await toggleSkillPin(skillStates, skillId);
    setSkillStates(newStates);
    setSkills(loadSkills(prefs.globalSkillDirectory, newStates, projectStates));
    await showToast({ style: Toast.Style.Success, title: "已更新置顶状态" });
  };

  const handleToggleFavorite = async (skillId: string) => {
    const newStates = await toggleSkillFavorite(skillStates, skillId);
    setSkillStates(newStates);
    setSkills(loadSkills(prefs.globalSkillDirectory, newStates, projectStates));
    await showToast({ style: Toast.Style.Success, title: "已更新收藏状态" });
  };

  const handleExecuteCommand = async (
    commandId: string,
    skillId: string,
    targetPath: string,
  ) => {
    const cmd = commands.find((c) => c.id === commandId);
    if (!cmd || !targetPath) return;
    const newStates = await recordSkillUsage(skillStates, skillId);
    setSkillStates(newStates);
    await executeCommand(cmd, targetPath);
    await popToRoot();
  };

  const handleSyncToGlobal = async (skill: Skill) => {
    try {
      await syncSkillToGlobal(skill, prefs.globalSkillDirectory);
      if (backupDir) await backupSkill(skill, backupDir);
      await showToast({
        style: Toast.Style.Success,
        title: "已同步到全局仓库",
      });
      await refreshSkills();
    } catch (e: any) {
      await showToast({
        style: Toast.Style.Failure,
        title: "同步失败",
        message: e.message,
      });
    }
  };

  const handleBackupAll = async () => {
    if (!backupDir) {
      await showToast({
        style: Toast.Style.Failure,
        title: "未设置备份目录",
        message: "请在扩展设置中配置 Skill Backup Directory",
      });
      return;
    }
    try {
      const count = await backupAllSkills(skills, backupDir);
      await showToast({
        style: Toast.Style.Success,
        title: `已备份 ${count} 个技能`,
        message: `→ ${expandPath(backupDir)}`,
      });
    } catch (e: any) {
      await showToast({
        style: Toast.Style.Failure,
        title: "备份失败",
        message: e.message,
      });
    }
  };

  // SSOT: 始终打开 Master 文件（.agents/skills 下的主干）
  const getMasterPath = (skill: Skill): string => {
    // 1. 当前 scope 下的 Antigravity 主干
    if (scopeFilter.startsWith("project:")) {
      const pPath = scopeFilter.slice(8);
      const master = skill.installations.find(
        (i) => i.projectPath === pPath && i.agentType === "Antigravity",
      );
      if (master) return master.filePath;
    }
    // 2. 全局主干
    const global = skill.installations.find((i) => i.type === "global");
    if (global) return global.filePath;
    // 3. 任意 Antigravity 安装
    const anyMaster = skill.installations.find(
      (i) => i.agentType === "Antigravity",
    );
    if (anyMaster) return anyMaster.filePath;
    // 4. fallback
    return skill.installations[0]?.filePath || "";
  };

  const renderSkillItem = (skill: Skill) => {
    const accessories: List.Item.Accessory[] = [];

    const globalIns = skill.installations.find((i) => i.type === "global");
    if (globalIns)
      accessories.push({ tag: { value: "Global", color: Color.Green } });

    // 主干安装数
    const masterIns = skill.installations.filter(
      (i) => i.agentType === "Antigravity" && i.type === "project",
    );
    if (masterIns.length > 0) {
      accessories.push({
        tag: `${masterIns.length} 项目`,
        tooltip: masterIns.map((i) => i.projectName).join("\n"),
      });
    }

    // Symlink 健康状态
    const symlinkIns = skill.installations.filter((i) => i.isSymlink);
    if (symlinkIns.length > 0) {
      accessories.push({
        icon: Icon.Link,
        tooltip: `🔗 Symlink: ${symlinkIns.map((i) => i.agentType).join(", ")}`,
      });
    }

    // 非 symlink 的 Non-Universal 安装（可能是旧的 copy 残留）
    const nonUniversalCopies = skill.installations.filter(
      (i) =>
        i.type === "project" && i.agentType !== "Antigravity" && !i.isSymlink,
    );
    if (nonUniversalCopies.length > 0) {
      accessories.push({
        icon: Icon.Warning,
        tooltip: `⚠️ 非 symlink 副本: ${nonUniversalCopies.map((i) => `${i.projectName}(${i.agentType})`).join(", ")}`,
      });
    }

    if (skill.isPinned) accessories.push({ icon: Icon.Pin });
    if (skill.isFavorite) accessories.push({ icon: Icon.Star });

    // 备份状态
    if (backupDir) {
      const backed = isSkillBackedUp(skill.name, backupDir);
      accessories.push(
        backed
          ? {
              tag: { value: "💾", color: Color.Blue },
              tooltip: `已备份到 ${expandPath(backupDir)}`,
            }
          : {
              tag: { value: "未备份", color: Color.SecondaryText },
              tooltip: "未备份",
            },
      );
    }

    accessories.push({ icon: Icon.Keyboard, tooltip: shortcutsTooltip });

    const masterPath = getMasterPath(skill);

    return (
      <List.Item
        key={skill.id}
        title={skill.name}
        subtitle={
          skill.description ||
          (skill.installations[0]
            ? shortenPath(skill.installations[0].filePath)
            : "")
        }
        accessories={accessories}
        actions={
          <ActionPanel>
            <ActionPanel.Section title="打开/调用技能 (Master)">
              {commands.map((cmd) => {
                const shortcut = cmd.shortcut
                  ? {
                      modifiers: cmd.shortcut
                        .modifiers as Keyboard.KeyModifier[],
                      key: cmd.shortcut.key as Keyboard.KeyEquivalent,
                    }
                  : undefined;
                return (
                  <Action
                    key={cmd.id}
                    title={cmd.label}
                    icon={cmd.icon}
                    shortcut={shortcut}
                    onAction={() =>
                      handleExecuteCommand(cmd.id, skill.id, masterPath)
                    }
                  />
                );
              })}
            </ActionPanel.Section>

            <ActionPanel.Section title="分发与同步">
              <Action
                title="查看安装详情 (installations)"
                icon={Icon.Eye}
                shortcut={{ modifiers: ["cmd"], key: "d" }}
                onAction={() =>
                  push(
                    <SkillDetail
                      skill={skill}
                      projectStates={projectStates}
                      globalDir={prefs.globalSkillDirectory}
                      onChanged={refreshSkills}
                    />,
                  )
                }
              />
              <Action
                title="安装到项目 (install + Symlink)"
                icon={Icon.Download}
                onAction={() =>
                  push(
                    <InstallToProject
                      skill={skill}
                      projectStates={projectStates}
                      onInstalled={refreshSkills}
                    />,
                  )
                }
              />
              <Action
                title={
                  globalIns
                    ? "重新同步至全局仓库"
                    : "推送至全局仓库 (sync to Global)"
                }
                icon={Icon.Upload}
                shortcut={{ modifiers: ["cmd", "shift"], key: "u" }}
                onAction={() => handleSyncToGlobal(skill)}
              />
            </ActionPanel.Section>

            <ActionPanel.Section title="管理">
              <Action
                title={skill.isPinned ? "取消置顶" : "置顶"}
                icon={Icon.Pin}
                shortcut={{ modifiers: ["cmd", "shift"], key: "p" }}
                onAction={() => handleTogglePin(skill.id)}
              />
              <Action
                title={skill.isFavorite ? "取消收藏" : "收藏"}
                icon={Icon.Star}
                shortcut={{ modifiers: ["cmd", "shift"], key: "f" }}
                onAction={() => handleToggleFavorite(skill.id)}
              />
              {backupDir && (
                <Action
                  title="备份此技能"
                  icon={Icon.SaveDocument}
                  shortcut={{ modifiers: ["cmd", "shift"], key: "b" }}
                  onAction={async () => {
                    try {
                      await backupSkill(skill, backupDir);
                      await showToast({
                        style: Toast.Style.Success,
                        title: "已备份",
                        message: `→ ${expandPath(backupDir)}/${skill.name}`,
                      });
                      await refreshSkills();
                    } catch (e: any) {
                      await showToast({
                        style: Toast.Style.Failure,
                        title: "备份失败",
                        message: e.message,
                      });
                    }
                  }}
                />
              )}
              {backupDir && (
                <Action
                  title="批量备份所有技能"
                  icon={Icon.HardDrive}
                  onAction={handleBackupAll}
                />
              )}
            </ActionPanel.Section>
          </ActionPanel>
        }
      />
    );
  };

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder="搜索 AI Agent 技能 (vercel-labs/skills 标准)..."
      searchText={searchText}
      onSearchTextChange={setSearchText}
      filtering={false}
      searchBarAccessory={
        <List.Dropdown tooltip="区域/作用域过滤" onChange={setScopeFilter}>
          <List.Dropdown.Item title="全域混合视图 (All Skills)" value="all" />
          {sourceGroups.globals.length > 0 && (
            <List.Dropdown.Section title="全局技能库 (Canonical)">
              {sourceGroups.globals.map((g) => (
                <List.Dropdown.Item key={g.id} title={g.name} value={g.id} />
              ))}
            </List.Dropdown.Section>
          )}
          {sourceGroups.projects.length > 0 && (
            <List.Dropdown.Section title="项目专供 (Project)">
              {sourceGroups.projects.map((g) => (
                <List.Dropdown.Item key={g.id} title={g.name} value={g.id} />
              ))}
            </List.Dropdown.Section>
          )}
        </List.Dropdown>
      }
    >
      {pinned.length > 0 && (
        <List.Section title="📌 置顶技能" subtitle={`${pinned.length} 个`}>
          {pinned.map(renderSkillItem)}
        </List.Section>
      )}

      {favorited.length > 0 && (
        <List.Section title="★ 常用技能" subtitle={`${favorited.length} 个`}>
          {favorited.map(renderSkillItem)}
        </List.Section>
      )}

      <List.Section title="所有技能" subtitle={`${normal.length} 个`}>
        {normal.map(renderSkillItem)}
      </List.Section>
    </List>
  );
}

// ---- Subcomponent: InstallToProject ----
function InstallToProject({
  skill,
  projectStates,
  onInstalled,
}: {
  skill: Skill;
  projectStates: ProjectStates;
  onInstalled: () => void;
}) {
  const { pop } = useNavigation();
  const projects = loadProjects(projectStates);
  const [searchText, setSearchText] = useState("");

  const handleInstall = async (project: Project) => {
    try {
      const result = await installSkillToProject(skill, project.path);

      let message = `主干: .agents/skills/${skill.name}`;
      if (result.symlinked.length > 0) {
        message += ` | 🔗 symlink: ${result.symlinked.join(", ")}`;
      }
      if (result.copied.length > 0) {
        message += ` | 📋 copy: ${result.copied.join(", ")}`;
      }

      await showToast({
        style: Toast.Style.Success,
        title: `已安装到 ${project.name}`,
        message,
      });
      onInstalled();
      pop();
    } catch (e: any) {
      await showToast({
        style: Toast.Style.Failure,
        title: "安装失败",
        message: e.message,
      });
    }
  };

  const nonUniversalAgents = getInstalledNonUniversalAgents();
  const agentHint =
    nonUniversalAgents.length > 0
      ? `自动 symlink → ${nonUniversalAgents.map((a) => a.name).join(", ")}`
      : "仅写入 .agents/skills (无 Non-Universal Agent 需分发)";

  return (
    <List
      searchBarPlaceholder={`选择项目 — ${agentHint}`}
      searchText={searchText}
      onSearchTextChange={setSearchText}
    >
      {projects
        .filter((p) => !searchText || fuzzyMatchScore(searchText, p.name) > 0)
        .map((project) => (
          <List.Item
            key={project.id}
            title={project.name}
            subtitle={shortenPath(project.path)}
            actions={
              <ActionPanel>
                <Action
                  title={`安装到 ${project.name} (Master + Symlink)`}
                  icon={Icon.Link}
                  onAction={() => handleInstall(project)}
                />
              </ActionPanel>
            }
          />
        ))}
    </List>
  );
}

// ---- Subcomponent: SkillDetail (安装详情视图) ----
function SkillDetail({
  skill,
  projectStates,
  globalDir,
  onChanged,
}: {
  skill: Skill;
  projectStates: ProjectStates;
  globalDir: string;
  onChanged: () => void;
}) {
  const { pop, push } = useNavigation();

  // 直接用 state 管理 Agent 全局安装状态，确保操作后能刷新
  const nonUniversalAgents = getInstalledNonUniversalAgents();

  const scanAgentStatus = () =>
    nonUniversalAgents.map((agent) => {
      const agentGlobalPath = path.join(
        expandPath(agent.globalSkillsDir),
        skill.name,
      );
      const exists = fs.existsSync(agentGlobalPath);
      const isSym = exists && isSymlinkCheck(agentGlobalPath);
      return { agent, path: agentGlobalPath, exists, isSymlink: isSym };
    });

  const [agentGlobalStatus, setAgentGlobalStatus] = useState(scanAgentStatus);

  const handleReinstallToProject = async (
    projectPath: string,
    projectName: string,
  ) => {
    try {
      const result = await installSkillToProject(skill, projectPath);
      let msg = `主干: .agents/skills/${skill.name}`;
      if (result.symlinked.length > 0)
        msg += ` | 🔗 ${result.symlinked.join(", ")}`;
      if (result.copied.length > 0) msg += ` | 📋 ${result.copied.join(", ")}`;
      await showToast({
        style: Toast.Style.Success,
        title: `已重新安装到 ${projectName}`,
        message: msg,
      });
      setAgentGlobalStatus(scanAgentStatus());
      onChanged();
    } catch (e: any) {
      await showToast({
        style: Toast.Style.Failure,
        title: "重新安装失败",
        message: e.message,
      });
    }
  };

  const handleResyncGlobal = async () => {
    try {
      await syncSkillToGlobal(skill, globalDir);
      await showToast({
        style: Toast.Style.Success,
        title: "已重新同步到全局仓库",
      });
      setAgentGlobalStatus(scanAgentStatus());
      onChanged();
    } catch (e: any) {
      await showToast({
        style: Toast.Style.Failure,
        title: "同步失败",
        message: e.message,
      });
    }
  };

  // 按位置分组
  const globalInstalls = skill.installations.filter((i) => i.type === "global");
  const projectGroups = new Map<string, SkillInstallation[]>();
  skill.installations
    .filter((i) => i.type === "project")
    .forEach((ins) => {
      const key = ins.projectPath || "unknown";
      if (!projectGroups.has(key)) projectGroups.set(key, []);
      projectGroups.get(key)!.push(ins);
    });

  const handleSyncToAgent = async (agent: AgentConfig) => {
    try {
      const result = await syncSkillToAgentGlobal(skill, agent, globalDir);
      const method = result === "symlinked" ? "🔗 symlink" : "📋 copy";
      await showToast({
        style: Toast.Style.Success,
        title: `已同步到 ${agent.name}`,
        message: `${method} → ${expandPath(agent.globalSkillsDir)}`,
      });
      setAgentGlobalStatus(scanAgentStatus());
      onChanged();
    } catch (e: any) {
      await showToast({
        style: Toast.Style.Failure,
        title: `同步到 ${agent.name} 失败`,
        message: e.message,
      });
    }
  };

  return (
    <List navigationTitle={`${skill.name} — 安装详情`}>
      {/* 全局安装 (Canonical) */}
      {globalInstalls.length > 0 && (
        <List.Section
          title="🌐 全局仓库 (Canonical)"
          subtitle={shortenPath(expandPath(globalDir))}
        >
          {globalInstalls.map((ins, idx) => (
            <List.Item
              key={`global-${idx}`}
              title={ins.filePath.split("/").pop() || skill.name}
              subtitle={shortenPath(ins.filePath)}
              icon={Icon.Globe}
              accessories={[{ tag: { value: "Master", color: Color.Green } }]}
              actions={
                <ActionPanel>
                  <Action
                    title="重新同步到全局"
                    icon={Icon.Upload}
                    onAction={handleResyncGlobal}
                  />
                  <Action.OpenWith path={ins.filePath} />
                </ActionPanel>
              }
            />
          ))}
        </List.Section>
      )}
      {globalInstalls.length === 0 && (
        <List.Section title="🌐 全局仓库 (Canonical)">
          <List.Item
            title="未安装到全局仓库"
            subtitle="选择此项推送至全局"
            icon={Icon.PlusCircle}
            accessories={[{ tag: { value: "未安装", color: Color.Orange } }]}
            actions={
              <ActionPanel>
                <Action
                  title="推送至全局仓库"
                  icon={Icon.Upload}
                  onAction={handleResyncGlobal}
                />
              </ActionPanel>
            }
          />
        </List.Section>
      )}

      {/* Non-Universal Agent 全局目录 */}
      {agentGlobalStatus.length > 0 && (
        <List.Section
          title="🔗 Non-Universal Agent 全局"
          subtitle="symlink → Canonical"
        >
          {agentGlobalStatus.map(
            ({ agent, path: agentPath, exists, isSymlink: isSym }) => {
              const statusTag = !exists
                ? { value: "未安装", color: Color.Orange }
                : isSym
                  ? { value: "🔗 symlink", color: Color.Blue }
                  : { value: "⚠️ copy", color: Color.Orange };
              const icon = !exists
                ? Icon.PlusCircle
                : isSym
                  ? Icon.Link
                  : Icon.Warning;
              return (
                <List.Item
                  key={agent.id}
                  title={agent.name}
                  subtitle={shortenPath(agentPath)}
                  icon={icon}
                  accessories={[{ tag: statusTag }]}
                  actions={
                    <ActionPanel>
                      <Action
                        title={
                          exists
                            ? `重新同步到 ${agent.name}`
                            : `安装到 ${agent.name}`
                        }
                        icon={exists ? Icon.ArrowClockwise : Icon.Download}
                        onAction={() => handleSyncToAgent(agent)}
                      />
                      {exists && <Action.OpenWith path={agentPath} />}
                    </ActionPanel>
                  }
                />
              );
            },
          )}
        </List.Section>
      )}

      {/* 各项目安装 */}
      {Array.from(projectGroups.entries()).map(([projPath, installs]) => {
        const projName =
          installs[0]?.projectName || projPath.split("/").pop() || "";
        return (
          <List.Section
            key={projPath}
            title={`📦 ${projName}`}
            subtitle={shortenPath(projPath)}
          >
            {installs.map((ins, idx) => {
              const statusTag = ins.isSymlink
                ? { value: "🔗 symlink", color: Color.Blue }
                : ins.agentType === "Antigravity"
                  ? { value: "Master", color: Color.Green }
                  : { value: "⚠️ copy", color: Color.Orange };
              return (
                <List.Item
                  key={`${projPath}-${idx}`}
                  title={ins.agentType}
                  subtitle={shortenPath(ins.filePath)}
                  icon={
                    ins.isSymlink
                      ? Icon.Link
                      : ins.agentType === "Antigravity"
                        ? Icon.CheckCircle
                        : Icon.Warning
                  }
                  accessories={[{ tag: statusTag }]}
                  actions={
                    <ActionPanel>
                      <Action
                        title={`重新安装到 ${projName}`}
                        icon={Icon.ArrowClockwise}
                        onAction={() =>
                          handleReinstallToProject(projPath, projName)
                        }
                      />
                      <Action.OpenWith path={ins.filePath} />
                    </ActionPanel>
                  }
                />
              );
            })}
          </List.Section>
        );
      })}

      {/* 可安装到的新项目 */}
      <List.Section title="➕ 安装到更多项目">
        <List.Item
          title="选择项目安装..."
          icon={Icon.PlusCircle}
          actions={
            <ActionPanel>
              <Action
                title="安装到项目 (install + Symlink)"
                icon={Icon.Download}
                onAction={() =>
                  push(
                    <InstallToProject
                      skill={skill}
                      projectStates={projectStates}
                      onInstalled={() => {
                        onChanged();
                        pop();
                      }}
                    />,
                  )
                }
              />
            </ActionPanel>
          }
        />
      </List.Section>
    </List>
  );
}
