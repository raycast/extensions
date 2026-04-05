import { Icon } from "@raycast/api";

/**
 * 项目数据模型
 * 代表一个本地项目目录
 */
export interface Project {
  /** 唯一标识（基于路径的 hash） */
  id: string;
  /** 项目名称（默认为目录名） */
  name: string;
  /** 项目绝对路径 */
  path: string;
  /** 是否置顶 */
  isPinned: boolean;
  /** 是否收藏 */
  isFavorite: boolean;
  /** 置顶时间戳（用于排序） */
  pinnedAt?: number;
  /** 收藏时间戳（用于排序） */
  favoritedAt?: number;
  /** 使用次数 */
  usageCount?: number;
  /** 最后使用时间 */
  lastUsedAt?: number;
}

/**
 * 命令操作定义
 * 定义可以对项目执行的工具/IDE 命令
 */
export interface CommandDef {
  /** 命令唯一标识，如 "agy", "idea" */
  id: string;
  /** 显示名称 */
  label: string;
  /** 命令模板，{path} 会被替换为项目路径 */
  template: string;
  /** Raycast 图标 */
  icon: Icon;
  /** 快捷键配置 */
  shortcut?: { modifiers: string[]; key: string };
}

/**
 * 项目状态信息（持久化存储）
 * 保存置顶/收藏等用户自定义状态
 */
export interface ProjectState {
  isPinned: boolean;
  isFavorite: boolean;
  pinnedAt?: number;
  favoritedAt?: number;
  usageCount?: number;
  lastUsedAt?: number;
}

/** 所有项目的状态映射表 */
export type ProjectStates = Record<string, ProjectState>;

/**
 * Agent 配置注册表项
 * 对齐 vercel-labs/skills 的 AgentConfig 概念
 */
export interface AgentConfig {
  /** 唯一标识，如 "claude-code" */
  id: string;
  /** 显示名称，如 "Claude Code" */
  name: string;
  /** 项目级 skills 目录（相对项目根），如 ".claude/skills" */
  skillsDir: string;
  /** 全局级 skills 目录（绝对路径模板），如 "~/.claude/skills" */
  globalSkillsDir: string;
  /** 是否为 Universal Agent（skillsDir === ".agents/skills"） */
  isUniversal: boolean;
  /** 检测本机是否安装该 Agent */
  detectInstalled: () => boolean;
}

export type AgentType = string; // 动态来自注册表，不再硬编码

export interface SkillInstallation {
  type: "global" | "project";
  projectPath?: string;
  projectName?: string;
  agentType: string;
  filePath: string;
  sourceGroupId: string;
  isSymlink?: boolean; // 标记是否为 symlink 指向主干
}

/**
 * 技能数据模型聚合
 */
export interface Skill {
  /** 唯一标识（基于名称聚合） */
  id: string;
  /** 技能名称 */
  name: string;
  /** 技能简介/描述 */
  description: string;

  /** 分布在各处的安装实例 */
  installations: SkillInstallation[];

  /** 是否置顶 */
  isPinned: boolean;
  /** 是否收藏 */
  isFavorite: boolean;
  /** 置顶时间戳（用于排序） */
  pinnedAt?: number;
  /** 收藏时间戳（用于排序） */
  favoritedAt?: number;
  /** 使用次数 */
  usageCount?: number;
  /** 最后使用时间 */
  lastUsedAt?: number;
}

/**
 * 技能状态信息（持久化存储）
 */
export interface SkillState {
  isPinned: boolean;
  isFavorite: boolean;
  pinnedAt?: number;
  favoritedAt?: number;
  usageCount?: number;
  lastUsedAt?: number;
}

/** 所有技能的状态映射表 */
export type SkillStates = Record<string, SkillState>;
