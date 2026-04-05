import { getPreferenceValues } from "@raycast/api";
import { readdirSync, statSync, readFileSync, existsSync } from "fs";
import { join, basename } from "path";
import { homedir } from "os";
import { Project, ProjectStates } from "./types";
import { getProjectState } from "./storage";

/**
 * 生成项目 ID（基于路径的简单 hash）
 */
function generateId(path: string): string {
  let hash = 0;
  for (let i = 0; i < path.length; i++) {
    const char = path.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash |= 0; // 转为 32 位整数
  }
  return Math.abs(hash).toString(36);
}

/**
 * 展开 ~ 为用户 home 目录
 */
function expandPath(p: string): string {
  if (p.startsWith("~")) {
    return join(homedir(), p.slice(1));
  }
  return p;
}

/**
 * 缩略路径（将 home 目录替换为 ~）
 */
export function shortenPath(p: string): string {
  const home = homedir();
  if (p.startsWith(home)) {
    return "~" + p.slice(home.length);
  }
  return p;
}

/**
 * 递归扫描，查找包含 .git 的目录
 */
function scanRecursive(
  dirPath: string,
  currentDepth: number,
  maxDepth: number,
  results: string[],
) {
  if (currentDepth >= maxDepth) return;

  const expanded = expandPath(dirPath.trim());

  try {
    let isGitRepo = false;
    // 检查当前目录是否是 Git 仓库
    const gitPath = join(expanded, ".git");
    try {
      if (statSync(gitPath).isDirectory() || statSync(gitPath).isFile()) {
        // 找到 .git，记录该目录为项目
        results.push(expanded);
        isGitRepo = true;
      }
    } catch {
      // .git 不存在
    }

    if (isGitRepo) {
      // 检查是否包含 submodule
      const gitModulesPath = join(expanded, ".gitmodules");
      if (existsSync(gitModulesPath)) {
        try {
          const content = readFileSync(gitModulesPath, "utf-8");
          const pathRegex = /path\s*=\s*(.+)/g;
          let match;
          while ((match = pathRegex.exec(content)) !== null) {
            const subPath = match[1].trim().replace(/^['"]|['"]$/g, "");
            const fullSubPath = join(expanded, subPath);
            scanRecursive(fullSubPath, currentDepth + 1, maxDepth, results);
          }
        } catch {
          // 读取或解析 .gitmodules 失败则静默跳过
        }
      }
      return; // 已经识别为项目，不暴力向下扫描其他无关目录
    }

    // 非 Git 仓库，继续向下扫描子目录
    const entries = readdirSync(expanded);
    for (const entry of entries) {
      // 跳过隐藏目录和常见无关目录
      if (entry.startsWith(".")) continue;
      const skipDirs = [
        "node_modules",
        "build",
        ".build",
        "Pods",
        "DerivedData",
        "venv",
        "__pycache__",
      ];
      if (skipDirs.includes(entry)) continue;

      const fullPath = join(expanded, entry);
      try {
        if (statSync(fullPath).isDirectory()) {
          scanRecursive(fullPath, currentDepth + 1, maxDepth, results);
        }
      } catch {
        // 权限或访问错误静默跳过
      }
    }
  } catch {
    // 目录不存在或无权限，静默跳过
  }
}

/**
 * 扫描指定目录列表
 * @returns Git仓库目录的绝对路径列表
 */
function scanDirectories(dirs: string[], maxDepth = 4): string[] {
  const results: string[] = [];
  for (const dir of dirs) {
    if (!dir) continue;
    scanRecursive(dir, 0, maxDepth, results);
  }
  return results.sort();
}

/**
 * 加载所有项目
 * 从 Preferences 中读取扫描目录列表，扫描后合并状态信息
 */
export function loadProjects(states: ProjectStates): Project[] {
  const prefs = getPreferenceValues<{ scanDirectories: string }>();
  const dirs = prefs.scanDirectories
    .split(",")
    .map((d) => d.trim())
    .filter(Boolean);

  // 扫描所有目录及其子目录（递归查找 Git 仓库，去重已在扫描逻辑中处理或由 Set 保证）
  const allPaths = Array.from(new Set(scanDirectories(dirs)));

  // 将路径转换为 Project 对象，合并持久化状态
  return allPaths.map((p) => {
    const id = generateId(p);
    const state = getProjectState(states, id);
    return {
      id,
      name: basename(p),
      path: p,
      isPinned: state.isPinned,
      isFavorite: state.isFavorite,
      pinnedAt: state.pinnedAt,
      favoritedAt: state.favoritedAt,
      usageCount: state.usageCount || 0,
      lastUsedAt: state.lastUsedAt,
    };
  });
}

/**
 * 排序项目列表
 * 规则：置顶 > 收藏 > 普通
 * @param isSearching 如果正在搜索，普通项目保持原序（原序已按匹配分排序）；否则按名称字母序
 */
export function sortProjects(
  projects: Project[],
  isSearching: boolean = false,
): {
  pinned: Project[];
  favorited: Project[];
  normal: Project[];
} {
  // 注意：传进来的 projects 已经在外层做好了按分数倒序排列
  const pinned = projects
    .filter((p) => p.isPinned)
    .sort((a, b) => (isSearching ? 0 : (a.pinnedAt ?? 0) - (b.pinnedAt ?? 0)));

  const favorited = projects
    .filter((p) => !p.isPinned && p.isFavorite)
    .sort((a, b) =>
      isSearching ? 0 : (a.favoritedAt ?? 0) - (b.favoritedAt ?? 0),
    );

  const normal = projects.filter((p) => !p.isPinned && !p.isFavorite);

  if (!isSearching) {
    normal.sort((a, b) => {
      // 按使用频率倒序
      const countDiff = (b.usageCount || 0) - (a.usageCount || 0);
      if (countDiff !== 0) return countDiff;

      // 频率相同，按最后使用时间倒序
      const timeDiff = (b.lastUsedAt || 0) - (a.lastUsedAt || 0);
      if (timeDiff !== 0) return timeDiff;

      // 最后按名称
      return a.name.localeCompare(b.name);
    });
  }

  return { pinned, favorited, normal };
}

/**
 * 模糊匹配评分：关键字中的字符按顺序出现在目标中即可匹配
 * 评分规则：连续匹配加分、首字母匹配加分、完全子串匹配极大加分
 * @returns 匹配分数（0 表示不匹配，越高越好）
 */
export function fuzzyMatchScore(keyword: string, target: string): number {
  if (!keyword) return 1;
  const keyMatch = keyword.toLowerCase();
  const targetMatch = target.toLowerCase();

  // 完全包含子串（最高优先级加分）
  let baseScore = 0;
  if (targetMatch.includes(keyMatch)) {
    baseScore += 100; // 极大加分，确保完全包含的排在前面
    if (targetMatch.startsWith(keyMatch)) {
      baseScore += 50; // 开头匹配再额外加分
    }
  }

  const keyChars = Array.from(keyMatch);
  const targetChars = Array.from(targetMatch);
  let keyIndex = 0;
  let score = baseScore;
  let lastMatchIndex = -2;

  for (let i = 0; i < targetChars.length; i++) {
    if (keyIndex >= keyChars.length) break;
    const char = targetChars[i];
    if (char === keyChars[keyIndex]) {
      score += 1;
      // 连续匹配加分
      if (i === lastMatchIndex + 1) {
        score += 5; // 提高连续匹配的分数比重
      }
      // 首字母或分隔符后加分（如 '-', '_', '/' 后的字符）
      if (i === 0 || (i > 0 && "-_/. ".includes(targetChars[i - 1]))) {
        score += 10; // 提高首字母命中得分
      }
      lastMatchIndex = i;
      keyIndex += 1;
    }
  }

  // 只有全部关键字字符都按顺序匹配上才返回分数
  return keyIndex === keyChars.length ? score : 0;
}
