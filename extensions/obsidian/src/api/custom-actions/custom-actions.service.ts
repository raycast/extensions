import { LocalStorage } from "@raycast/api";
import { CustomAction } from "./custom-actions.types";

const ACTIONS_KEY = "obsidian_custom_actions";

export async function getCustomActions(): Promise<CustomAction[]> {
  const data = await LocalStorage.getItem<string>(ACTIONS_KEY);
  if (!data) {
    return [];
  }
  try {
    return JSON.parse(data) as CustomAction[];
  } catch (e) {
    console.error("Failed to parse custom actions", e);
    return [];
  }
}

export async function saveCustomAction(action: CustomAction): Promise<void> {
  const actions = await getCustomActions();
  const existingIndex = actions.findIndex((a) => a.id === action.id);

  if (existingIndex >= 0) {
    actions[existingIndex] = action;
  } else {
    actions.push(action);
  }

  await LocalStorage.setItem(ACTIONS_KEY, JSON.stringify(actions));
}

export async function deleteCustomAction(actionId: string): Promise<void> {
  const actions = await getCustomActions();
  const newActions = actions.filter((a) => a.id !== actionId);
  await LocalStorage.setItem(ACTIONS_KEY, JSON.stringify(newActions));
}

export async function getCustomAction(actionId: string): Promise<CustomAction | undefined> {
  const actions = await getCustomActions();
  return actions.find((a) => a.id === actionId);
}
