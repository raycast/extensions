/**
 * 测试用的 @raycast/api 桩。真实模块在 Raycast 进程外导入会炸。
 *
 * trash:storage 删快照/历史/备份时把文件移进废纸篓;测试里没有废纸篓,直接删掉,行为等价
 */
import { rm } from "node:fs/promises";

export async function trash(path: string | string[]): Promise<void> {
  for (const p of Array.isArray(path) ? path : [path]) await rm(p, { force: true });
}
