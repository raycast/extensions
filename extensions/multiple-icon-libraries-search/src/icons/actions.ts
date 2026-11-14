// Which main action Enter runs, per the Enter Action setting, and the notice when an AI pick is remembered.

export type MainAction = "paste-name" | "copy-name" | "paste-svg" | "copy-svg" | "copy-react";

/** The main actions in their usual order. Raycast gives the first Enter and the second ⌘↵. */
export const MAIN_ACTIONS: MainAction[] = ["paste-name", "copy-svg", "copy-name", "paste-svg", "copy-react"];

/** The main actions with the Enter Action setting's choice first; an unknown setting keeps the usual order. */
export function mainActionOrder(enter: string | undefined): MainAction[] {
  const first = MAIN_ACTIONS.find((action) => action === enter);
  return first ? [first, ...MAIN_ACTIONS.filter((action) => action !== first)] : [...MAIN_ACTIONS];
}

/** The notice after an AI pick is remembered, e.g. “happy face” now finds smile-dizzy. */
export function savedNotice(phrase: string, iconName: string): string {
  return `“${phrase}” now finds ${iconName}`;
}

/** A HUD line: what the action did, then the remembered pick, if any. */
export function hudText(done: string | undefined, notice: string | undefined): string | undefined {
  const parts = [done, notice].filter(Boolean);
  return parts.length ? parts.join(" · ") : undefined;
}
