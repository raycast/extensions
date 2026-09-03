/**
 * Provider Registry — IDE 注册中心
 *
 * 新增 IDE 支持只需：
 * 1. 在 providers/ 下创建新的 provider 文件
 * 2. 在此文件中 import 并添加到 allProviders 数组
 */

import type { IDEProvider } from "./types";
import { vscodeProvider } from "./vscode";
import { traeProvider } from "./trae";
import { antigravityProvider } from "./antigravity";

export const allProviders: IDEProvider[] = [
  vscodeProvider,
  traeProvider,
  antigravityProvider,
];

/**
 * 根据 ID 查找 provider
 */
export function getProviderById(id: string): IDEProvider | undefined {
  return allProviders.find((p) => p.id === id);
}
