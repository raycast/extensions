import { createSourceRow, validateSourceRow, type StoredSource } from "./source-catalog";
import { openCommandForApp } from "./unread-count";

export function toggleSourceEnabled(sources: readonly StoredSource[], id: string): StoredSource[] {
  return sources.map((source) => (source.id === id ? { ...source, enabled: !source.enabled } : source));
}

export function removeSource(sources: readonly StoredSource[], id: string): StoredSource[] {
  return sources.filter((source) => source.id !== id);
}

export type MoveDirection = "up" | "down";

export function moveSource(sources: readonly StoredSource[], id: string, direction: MoveDirection): StoredSource[] {
  const index = sources.findIndex((source) => source.id === id);
  if (index === -1) return [...sources];
  // The view sections rows by the enabled flag (Active / Disabled): a move
  // swaps with the nearest row of the same section so a row never crosses
  // the split — moving past a row in the other section would render as a
  // no-op anyway.
  const section = sources
    .map((source, i) => (source.enabled === sources[index].enabled ? i : -1))
    .filter((i) => i !== -1);
  const target = section[section.indexOf(index) + (direction === "up" ? -1 : 1)];
  if (target === undefined) return [...sources];
  const rows = [...sources];
  rows[index] = sources[target];
  rows[target] = sources[index];
  return rows;
}

export function defaultOpenCommand(appPath: string): string {
  return openCommandForApp(appPath);
}

export type InstalledApplication = { name: string; path: string };

export type AddSourceValues = { appPath: string; openCommand?: string };

export type EditSourceValues = { openCommand?: string };

export function addSourceDraft(values: AddSourceValues): StoredSource {
  return createSourceRow({ id: "", ...values });
}

export function editSourceDraft(source: StoredSource, values: EditSourceValues): StoredSource {
  const openCommand = values.openCommand?.trim();
  return {
    id: source.id,
    name: source.name,
    dockName: source.dockName,
    ...(source.appPath !== undefined ? { appPath: source.appPath } : {}),
    ...(openCommand ? { openCommand } : {}),
    enabled: source.enabled,
  };
}

export type SourceFormErrors = { appPath?: string };

export function sourceFormErrors(draft: StoredSource, catalogRows: readonly StoredSource[]): SourceFormErrors {
  const reason = validateSourceRow(draft, catalogRows);
  return reason === "Application is already in the Source Catalog" ? { appPath: reason } : {};
}

export function addSourceRow(sources: readonly StoredSource[], values: AddSourceValues): StoredSource[] {
  return [...sources, createSourceRow(values)];
}

export function updateSourceRow(sources: readonly StoredSource[], draft: StoredSource): StoredSource[] {
  return sources.map((source) => (source.id === draft.id ? { ...draft } : source));
}
