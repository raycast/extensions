import { Icon, type Keyboard } from "@raycast/api";

type Creativity = "none" | "low" | "medium" | "high" | "maximum";

export const CONTRIBUTE_URL = "https://github.com/raycast/ray-so";

export function wrapInCodeBlock(text: string, language = "sh") {
  const backticks = "```";
  return `${backticks}${language}\n${text}\n${backticks}`;
}

export const raycastProtocol = `${process.env.RAYCAST_SCHEME ?? "raycast"}://`;

/** Creates a shortcut that uses the conventional modifiers on macOS and Windows. */
export function platformShortcut(modifiers: Keyboard.KeyModifier[], key: Keyboard.KeyEquivalent): Keyboard.Shortcut {
  return {
    macOS: { modifiers, key },
    Windows: {
      modifiers: modifiers.map((modifier) => {
        if (modifier === "cmd") return "ctrl";
        if (modifier === "opt") return "alt";
        return modifier;
      }),
      key,
    },
  };
}

export const getIcon = (icon: string) => {
  return icon
    .replace(/-([a-z])/g, (g) => g[1].toUpperCase())
    .replace(/^./, (str) => str.toUpperCase()) as keyof typeof Icon;
};

export function getCreativityIcon(creativity?: Creativity) {
  const icons: Record<Creativity, Icon> = {
    none: Icon.CircleDisabled,
    low: Icon.StackedBars1,
    medium: Icon.StackedBars2,
    high: Icon.StackedBars3,
    maximum: Icon.StackedBars4,
  };

  return icons[creativity ?? "none"];
}

export function prepareModel(model?: string, fallback?: string): string | undefined {
  const normalizedModel = model && /^".*"$/.test(model) ? model.slice(1, -1) : model;
  return normalizedModel || fallback;
}

export function addModifiersToKeyword({
  keyword,
  start,
  end,
}: {
  keyword: string;
  start: Preferences.ExploreSnippets["startModifier"];
  end: Preferences.ExploreSnippets["endModifier"];
}) {
  if (!keyword) return keyword;
  return `${start === "none" ? "" : start}${keyword}${end === "none" ? "" : end}`;
}
