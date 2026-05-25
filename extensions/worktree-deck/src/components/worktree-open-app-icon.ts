import { type Image, type List } from "@raycast/api";
import { worktreeIdeAppService, type WorktreeIdeApp } from "../domain/worktree-ide-app.service";
import { type WorktreeOpenApp } from "../domain/worktree-open-app.service";

/**
 * 起動アプリごとの公式アイコン asset と表示名
 */
const OPEN_APP_ICON_DEFINITIONS = {
  zed: {
    asset: "zed-icon.png",
    title: "Zed",
    tooltip: "Configured IDE",
  },
  "codex-app": {
    asset: "codex-app-icon.png",
    title: "CA",
    tooltip: "Codex App",
  },
} as const satisfies Record<WorktreeOpenApp, { asset: string; title: string; tooltip: string }>;

/**
 * 起動アプリの公式アイコンを返す
 */
export function resolveOpenAppIcon(openApp: WorktreeOpenApp): Image.ImageLike {
  return { source: OPEN_APP_ICON_DEFINITIONS[openApp].asset };
}

/**
 * 起動アプリの短い表示名を返す
 */
export function resolveOpenAppTitle(openApp: WorktreeOpenApp, ideApp: WorktreeIdeApp = "zed"): string {
  if (openApp === "zed") {
    return worktreeIdeAppService.formatIdeAppLabel(ideApp);
  }
  return OPEN_APP_ICON_DEFINITIONS[openApp].title;
}

/**
 * 起動アプリの補足説明を返す
 */
function resolveOpenAppTooltip(openApp: WorktreeOpenApp, ideApp: WorktreeIdeApp = "zed"): string {
  if (openApp === "zed") {
    return `${worktreeIdeAppService.formatIdeAppLabel(ideApp)} IDE`;
  }
  return OPEN_APP_ICON_DEFINITIONS[openApp].tooltip;
}

/**
 * リスト右端に表示する起動アプリアクセサリを返す
 */
export function buildOpenAppAccessory(openApp: WorktreeOpenApp, ideApp: WorktreeIdeApp = "zed"): List.Item.Accessory[] {
  return [{ icon: resolveOpenAppIcon(openApp), tooltip: resolveOpenAppTooltip(openApp, ideApp) }];
}
