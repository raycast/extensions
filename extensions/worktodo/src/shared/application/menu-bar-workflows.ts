import type { TaskService } from "../domain/task-service";
import { buildMenuBarModel, resolveMenuBarVisibility, type MenuBarModel } from "../presentation/menu-bar";
import { loadTaskView } from "./task-views";

type MenuBarSession = { service: TaskService; close: () => void };

type MenuBarVisibilityStore = {
  has(key: string): boolean;
  remove(key: string): void;
  set(key: string, value: string): void;
};

const MENU_BAR_HIDDEN_KEY = "hidden";

export function loadMenuBarModel(
  openSession: () => MenuBarSession,
  viewerTimeZone: string,
  evaluationInstantMs: number,
): MenuBarModel {
  const session = openSession();
  try {
    const context = { evaluationInstantMs, viewerTimeZone };
    const thisWeek = loadTaskView(session.service, { kind: "thisWeek" }, context);
    return buildMenuBarModel(thisWeek.result, session.service.listProjects());
  } finally {
    session.close();
  }
}

export function initialMenuBarHidden(store: MenuBarVisibilityStore, userInitiated: boolean): boolean {
  const visibility = resolveMenuBarVisibility(store.has(MENU_BAR_HIDDEN_KEY), userInitiated);
  if (visibility.clearStoredHidden) {
    store.remove(MENU_BAR_HIDDEN_KEY);
  }
  return visibility.hidden;
}

export function hideMenuBar(store: MenuBarVisibilityStore): void {
  store.set(MENU_BAR_HIDDEN_KEY, "true");
}
