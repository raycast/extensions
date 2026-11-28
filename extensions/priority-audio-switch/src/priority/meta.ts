// Per-device customization (display name, icon), keyed by device UID. Pure helpers.

export type DeviceMeta = { name?: string; icon?: string };
export type DeviceMetaMap = Record<string, DeviceMeta>;

/** Trim the name; an empty name or one equal to the system name is not a customization. */
export function normalizeMeta(meta: DeviceMeta, systemName: string): DeviceMeta {
  const name = meta.name?.trim();
  const result: DeviceMeta = {};
  if (name && name !== systemName) result.name = name;
  if (meta.icon) result.icon = meta.icon;
  return result;
}

/** Returns a new map with the device's customization replaced; an empty customization removes the entry. */
export function setMeta(map: DeviceMetaMap, uid: string, meta: DeviceMeta, systemName: string): DeviceMetaMap {
  const { [uid]: _removed, ...rest } = map;
  void _removed;
  const normalized = normalizeMeta(meta, systemName);
  return normalized.name || normalized.icon ? { ...rest, [uid]: normalized } : rest;
}

export const displayName = (systemName: string, meta?: DeviceMeta) => meta?.name || systemName;
