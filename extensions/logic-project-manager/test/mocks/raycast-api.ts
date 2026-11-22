import os from "node:os";
import path from "node:path";

// 仅供测试：被测模块顶层 import 了 @raycast/api，这里给最小桩，避免加载真实 Raycast 运行时。
// 偏好默认为空对象，可用 __setPreferences 设置；LocalStorage 用内存 Map 模拟（测试间用 clear() 重置）；
// environment.supportPath 可在用例里改成临时目录。
let preferences: Record<string, unknown> = {};

export function __setPreferences(next: Record<string, unknown>): void {
  preferences = next;
}

export function getPreferenceValues<T>(): T {
  return preferences as T;
}

export const environment = { extensionName: "test-extension", supportPath: path.join(os.tmpdir(), "asm-support") };

const store = new Map<string, string>();

export const LocalStorage = {
  async getItem<T>(key: string): Promise<T | undefined> {
    return store.get(key) as T | undefined;
  },
  async setItem(key: string, value: string): Promise<void> {
    store.set(key, value);
  },
  async removeItem(key: string): Promise<void> {
    store.delete(key);
  },
  async allItems(): Promise<Record<string, string>> {
    return Object.fromEntries(store);
  },
  async clear(): Promise<void> {
    store.clear();
  },
};

// Cache 用内存 Map 模拟（同步读写，与真实 API 一致）。
export class Cache {
  private data = new Map<string, string>();

  get(key: string): string | undefined {
    return this.data.get(key);
  }

  set(key: string, value: string): void {
    this.data.set(key, value);
  }

  has(key: string): boolean {
    return this.data.has(key);
  }

  remove(key: string): boolean {
    return this.data.delete(key);
  }

  clear(): void {
    this.data.clear();
  }
}

// Icon / Color 在真实 API 里是字符串枚举。测试只比较值，用 Proxy 让任意成员都取到自己的名字，
// 免得每加一个图标就要在这里补一行。
export const Icon = new Proxy({}, { get: (_target, key) => String(key) }) as Record<string, string>;
export const Color = new Proxy({}, { get: (_target, key) => String(key) }) as Record<string, string>;
