import { LocalStorage } from "@raycast/api";
import { ProjectState, ProjectStates, SkillState, SkillStates } from "./types";

/** LocalStorage 中的 key */
const STORAGE_KEY = "project-states";

/**
 * 从 LocalStorage 加载所有项目状态
 */
export async function loadProjectStates(): Promise<ProjectStates> {
  const raw = await LocalStorage.getItem<string>(STORAGE_KEY);
  if (!raw) return {};
  try {
    return JSON.parse(raw) as ProjectStates;
  } catch {
    return {};
  }
}

/**
 * 保存所有项目状态到 LocalStorage
 */
async function saveProjectStates(states: ProjectStates): Promise<void> {
  await LocalStorage.setItem(STORAGE_KEY, JSON.stringify(states));
}

/**
 * 获取单个项目的状态
 */
export function getProjectState(
  states: ProjectStates,
  projectId: string,
): ProjectState {
  return (
    states[projectId] ?? {
      isPinned: false,
      isFavorite: false,
      usageCount: 0,
    }
  );
}

/**
 * 切换项目的置顶状态
 * @returns 更新后的完整状态表
 */
export async function togglePin(
  states: ProjectStates,
  projectId: string,
): Promise<ProjectStates> {
  const current = getProjectState(states, projectId);
  const updated: ProjectStates = {
    ...states,
    [projectId]: {
      ...current,
      isPinned: !current.isPinned,
      pinnedAt: !current.isPinned ? Date.now() : undefined,
    },
  };
  await saveProjectStates(updated);
  return updated;
}

/**
 * 切换项目的收藏状态
 * @returns 更新后的完整状态表
 */
export async function toggleFavorite(
  states: ProjectStates,
  projectId: string,
): Promise<ProjectStates> {
  const current = getProjectState(states, projectId);
  const updated: ProjectStates = {
    ...states,
    [projectId]: {
      ...current,
      isFavorite: !current.isFavorite,
      favoritedAt: !current.isFavorite ? Date.now() : undefined,
    },
  };
  await saveProjectStates(updated);
  return updated;
}

/**
 * 记录项目使用次数
 * @returns 更新后的完整状态表
 */
export async function recordProjectUsage(
  states: ProjectStates,
  projectId: string,
): Promise<ProjectStates> {
  const current = getProjectState(states, projectId);
  const updated: ProjectStates = {
    ...states,
    [projectId]: {
      ...current,
      usageCount: (current.usageCount || 0) + 1,
      lastUsedAt: Date.now(),
    },
  };
  await saveProjectStates(updated);
  return updated;
}

/** ----------------- 技能状态管理 ----------------- */

/** LocalStorage 中的 key */
const SKILL_STORAGE_KEY = "skill-states";

export async function loadSkillStates(): Promise<SkillStates> {
  const raw = await LocalStorage.getItem<string>(SKILL_STORAGE_KEY);
  if (!raw) return {};
  try {
    return JSON.parse(raw) as SkillStates;
  } catch {
    return {};
  }
}

async function saveSkillStates(states: SkillStates): Promise<void> {
  await LocalStorage.setItem(SKILL_STORAGE_KEY, JSON.stringify(states));
}

export function getSkillState(
  states: SkillStates,
  skillId: string,
): SkillState {
  return (
    states[skillId] ?? {
      isPinned: false,
      isFavorite: false,
      usageCount: 0,
    }
  );
}

export async function toggleSkillPin(
  states: SkillStates,
  skillId: string,
): Promise<SkillStates> {
  const current = getSkillState(states, skillId);
  const updated: SkillStates = {
    ...states,
    [skillId]: {
      ...current,
      isPinned: !current.isPinned,
      pinnedAt: !current.isPinned ? Date.now() : undefined,
    },
  };
  await saveSkillStates(updated);
  return updated;
}

export async function toggleSkillFavorite(
  states: SkillStates,
  skillId: string,
): Promise<SkillStates> {
  const current = getSkillState(states, skillId);
  const updated: SkillStates = {
    ...states,
    [skillId]: {
      ...current,
      isFavorite: !current.isFavorite,
      favoritedAt: !current.isFavorite ? Date.now() : undefined,
    },
  };
  await saveSkillStates(updated);
  return updated;
}

export async function recordSkillUsage(
  states: SkillStates,
  skillId: string,
): Promise<SkillStates> {
  const current = getSkillState(states, skillId);
  const updated: SkillStates = {
    ...states,
    [skillId]: {
      ...current,
      usageCount: (current.usageCount || 0) + 1,
      lastUsedAt: Date.now(),
    },
  };
  await saveSkillStates(updated);
  return updated;
}
