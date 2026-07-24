import { environment, open } from "@raycast/api";
import { CategoryOption, expandCategoryIdsForDeeplink } from "./categories";
import { loadCustomCategories } from "./storage";
import { FocusMode } from "./types";

export type StartFocusOptions = {
  goal: string;
  categories: string[];
  durationSeconds: number;
  mode: FocusMode;
  /** Optional known custom categories used to expand ID candidates */
  knownCategories?: CategoryOption[];
};

/**
 * Raycast Beta/X registers `raycast-x://` (and also claims `raycast://`).
 * Custom Focus Categories live in the app that owns them — opening the wrong
 * scheme starts Focus without the user's categories (no sites blocked).
 */
export function focusUrlScheme(): "raycast-x" | "raycast" {
  const supportPath = environment.supportPath.toLowerCase();
  const assetsPath = environment.assetsPath.toLowerCase();
  if (
    supportPath.includes("raycast-x") ||
    supportPath.includes("com.raycast-x") ||
    assetsPath.includes("raycast-x") ||
    assetsPath.includes("com.raycast-x")
  ) {
    return "raycast-x";
  }
  return "raycast";
}

export function buildStartFocusDeeplink(options: StartFocusOptions): string {
  const parts: string[] = [];

  if (options.goal.trim()) {
    parts.push(`goal=${encodeURIComponent(options.goal.trim())}`);
  }

  const categoryIds = expandCategoryIdsForDeeplink(
    options.categories,
    options.knownCategories ?? [],
  );
  if (categoryIds.length > 0) {
    // Keep commas literal; encode each id. Raycast splits on "," after get().
    parts.push(`categories=${categoryIds.map(encodeURIComponent).join(",")}`);
  }

  if (options.durationSeconds > 0) {
    const duration = Math.min(options.durationSeconds, 24 * 60 * 60);
    parts.push(`duration=${duration}`);
  }

  parts.push(`mode=${options.mode === "allow" ? "allow" : "block"}`);

  return `${focusUrlScheme()}://focus/start?${parts.join("&")}`;
}

export async function startFocusSession(
  options: StartFocusOptions,
): Promise<void> {
  const knownCategories =
    options.knownCategories ?? (await loadCustomCategories());
  const deeplink = buildStartFocusDeeplink({ ...options, knownCategories });
  console.log(`Focus Scheduler: opening ${deeplink}`);
  await open(deeplink);
}

export async function completeFocusSession(): Promise<void> {
  await open(`${focusUrlScheme()}://focus/complete`);
}
