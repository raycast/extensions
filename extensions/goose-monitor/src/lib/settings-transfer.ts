import type { CategoryId } from "./types";
import type { SortDir, SortKey } from "./categories";

export const TRANSFER_KEYS = { category: "category", sort: "sort", networkSort: "sortNetwork" } as const;
export type PortableSettings = {
  category: CategoryId;
  sort: { key: SortKey; dir: SortDir };
  networkSort: { key: SortKey; dir: SortDir };
};
const categories = ["all", "gui", "cpu", "mem", "net", "bg"];
const keys = ["mem", "cpu", "procs", "name", "net", "down", "up"];

export function parseSettingsTransfer(json: string): PortableSettings {
  if (json.length > 16_384) throw new Error("设置文件过大");
  const value: unknown = JSON.parse(json);
  if (
    !value ||
    typeof value !== "object" ||
    Array.isArray(value) ||
    Object.keys(value).some((key) => !["format", "version", "settings"].includes(key))
  )
    throw new Error("无效设置文件");
  const { format, version, settings } = value as Record<string, unknown>;
  if (format !== "goose-monitor-settings" || version !== 1 || !settings || typeof settings !== "object")
    throw new Error("不支持的设置格式");
  const s = settings as Record<string, unknown>;
  if (Array.isArray(s) || Object.keys(s).some((key) => !["category", "sort", "networkSort"].includes(key)))
    throw new Error("无效设置文件");
  const sort = (candidate: unknown, network = false) => {
    if (
      !candidate ||
      typeof candidate !== "object" ||
      Array.isArray(candidate) ||
      Object.keys(candidate).some((key) => !["key", "dir"].includes(key))
    )
      throw new Error("无效排序设置");
    const { key, dir } = candidate as Record<string, unknown>;
    if (
      !keys.includes(String(key)) ||
      (!network && ["net", "down", "up"].includes(String(key))) ||
      (network && key === "procs") ||
      (dir !== "asc" && dir !== "desc")
    )
      throw new Error("无效排序设置");
    return { key: key as SortKey, dir: dir as SortDir };
  };
  if (!categories.includes(String(s.category))) throw new Error("无效分类设置");
  return { category: s.category as CategoryId, sort: sort(s.sort), networkSort: sort(s.networkSort, true) };
}

export function serializeSettingsTransfer(settings: PortableSettings): string {
  const json = JSON.stringify({ format: "goose-monitor-settings", version: 1, settings });
  parseSettingsTransfer(json);
  return json;
}
