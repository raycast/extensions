import { LocalStorage } from "@raycast/api";
import type { Workspace } from "./slack";

const WORKSPACES_KEY = "workspaces";
const LAST_FORM_KEY = "last-form";

export type LastForm = {
  teamIds: string[];
  emoji: string;
  text: string;
  duration: string;
};

async function readJson<T>(key: string, fallback: T): Promise<T> {
  const raw = await LocalStorage.getItem<string>(key);
  return raw ? (JSON.parse(raw) as T) : fallback;
}

export function loadWorkspaces(): Promise<Workspace[]> {
  return readJson<Workspace[]>(WORKSPACES_KEY, []);
}

export async function saveWorkspace(workspace: Workspace): Promise<void> {
  const others = (await loadWorkspaces()).filter((item) => item.teamId !== workspace.teamId);
  const next = [...others, workspace].sort((a, b) => a.name.localeCompare(b.name));
  await LocalStorage.setItem(WORKSPACES_KEY, JSON.stringify(next));
}

export async function removeWorkspace(teamId: string): Promise<void> {
  const next = (await loadWorkspaces()).filter((item) => item.teamId !== teamId);
  await LocalStorage.setItem(WORKSPACES_KEY, JSON.stringify(next));
}

export function loadLastForm(): Promise<LastForm | undefined> {
  return readJson<LastForm | undefined>(LAST_FORM_KEY, undefined);
}

export function saveLastForm(form: LastForm): Promise<void> {
  return LocalStorage.setItem(LAST_FORM_KEY, JSON.stringify(form));
}
