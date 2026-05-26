import { LocalStorage } from "@raycast/api";

const STORAGE_KEY = "project-command-overrides";

export type ProjectCommandOverrides = Record<string, string>;

export async function getCommandOverrides(): Promise<ProjectCommandOverrides> {
  const stored = await LocalStorage.getItem<string>(STORAGE_KEY);
  if (!stored) {
    return {};
  }

  try {
    const parsed = JSON.parse(stored);
    return typeof parsed === "object" &&
      parsed !== null &&
      !Array.isArray(parsed)
      ? parsed
      : {};
  } catch {
    await LocalStorage.removeItem(STORAGE_KEY);
    throw new Error(
      "Stored project command overrides were corrupted and have been reset.",
    );
  }
}

export async function setProjectCommand(
  projectKey: string,
  command: string,
): Promise<ProjectCommandOverrides> {
  const overrides = await getCommandOverrides();
  const trimmed = command.trim();

  if (trimmed) {
    overrides[projectKey] = trimmed;
  } else {
    delete overrides[projectKey];
  }

  await LocalStorage.setItem(STORAGE_KEY, JSON.stringify(overrides));
  return overrides;
}

export async function clearProjectCommand(
  projectKey: string,
): Promise<ProjectCommandOverrides> {
  const overrides = await getCommandOverrides();
  delete overrides[projectKey];
  await LocalStorage.setItem(STORAGE_KEY, JSON.stringify(overrides));
  return overrides;
}

export function resolveProjectCommand(
  overrides: ProjectCommandOverrides,
  projectKey: string,
  defaultCommand?: string,
): string {
  return overrides[projectKey]?.trim() || defaultCommand?.trim() || "";
}
