import {
  createEmptyPresetsFile,
  formatPresetsFile,
  parsePresetsFile,
  type PresetsFile,
  restoreProjectPresets,
} from "@env-keeper/core";
import { deleteConfigSnapshot, listConfigSnapshots, readConfigSnapshot, rewriteConfigSnapshot } from "./storage.js";

function parseOrNull(text: string): PresetsFile | null {
  try {
    return parsePresetsFile(text);
  } catch {
    return null;
  }
}

/** 两份文件在"方案 + 套用记录"上是否完全一样,不管数组顺序 */
export function samePresetsFile(a: PresetsFile, b: PresetsFile): boolean {
  const canon = (f: PresetsFile) =>
    JSON.stringify({
      presets: [...f.presets].sort((x, y) => x.id.localeCompare(y.id)),
      appliedState: Object.fromEntries(Object.entries(f.appliedState).sort(([x], [y]) => x.localeCompare(y))),
    });
  return canon(a) === canon(b);
}

/**
 * 方案历史**按项目**清理:把"最早一份被保留的版本"之前的**每一份**记录里本项目的部分都抹平(一份不留就是全部)。
 *
 * 历史是整份 presets.json 的快照,一份文件里装着所有项目的方案;直接删文件等于删掉所有项目在那一刻的还原点。
 * 所以不删文件,只把每一版里本项目的部分换成"处理完的前一版里本项目的样子"(最早的换成空):
 * 这些版本对本项目就不再是一次变化,自然从本项目的历史里消失,别的项目的还原点一个不少。
 * 换完之后整份跟前一版一模一样(别的项目在这一版也没动),这份文件就不再代表任何变化,删掉。
 *
 * 为什么是"整段"而不是只处理本项目有变动的那几版:中间那些"本项目没变"的版本仍然带着旧的本项目内容,
 * 只改有变动的几版,下一版就会跟改过的上一版对不上、重新冒出来当成一次变化——
 * 界面上表现为"选一个不留,清了三次才清干净"
 */
export async function cleanProjectPresetHistory(oldestKeptFilePath: string | null, projectId: string): Promise<void> {
  const list = await listConfigSnapshots("presets");
  // 处理"比最早一份被保留的版本更早"的全部文件;一份都不保留就是全部
  const boundary = oldestKeptFilePath ? list.findIndex((i) => i.filePath === oldestKeptFilePath) : -1;
  if (oldestKeptFilePath && boundary < 0) return;
  const range = (oldestKeptFilePath ? list.slice(boundary + 1) : list).reverse();
  let prev: PresetsFile | null = null;
  for (const item of range) {
    const here = parseOrNull(await readConfigSnapshot(item.filePath));
    if (!here) continue; // 读不出来的记录不动:它对别的项目也许还有用,也没法判断
    const next = restoreProjectPresets(here, prev ?? createEmptyPresetsFile(), projectId);
    const redundant = prev ? samePresetsFile(next, prev) : next.presets.length === 0;
    if (redundant) {
      await deleteConfigSnapshot(item.filePath);
      continue; // 删掉的这一版跟 prev 一样,prev 不用动
    }
    await rewriteConfigSnapshot(item.filePath, formatPresetsFile(next));
    prev = next;
  }
}
