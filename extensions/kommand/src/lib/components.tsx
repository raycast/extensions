import { Action, ActionPanel, Color, Icon, List, open } from "@raycast/api";
import { formatStep, keywordsForSteps, tooltipForStep } from "./keymap";
import { isKommandInstalled } from "./database";
import { KommandShortcut } from "./types";

export const APP_STORE_URL = "https://apps.apple.com/app/kommand/id6752623076";

/** Open Kommand via URL scheme, or the App Store if not installed. */
export async function openKommand(): Promise<void> {
  if (isKommandInstalled()) {
    await open("kommand://");
  } else {
    await open(APP_STORE_URL);
  }
}

// ── Shared Components ───────────────────────────────────────────────────

export function ShortcutItem({
  shortcut,
  subtitle,
}: {
  shortcut: KommandShortcut;
  subtitle?: string;
}) {
  const stepTags: List.Item.Accessory[] = shortcut.steps.map((step) => ({
    tag: { value: formatStep(step), color: Color.SecondaryText },
    tooltip: tooltipForStep(step),
  }));

  const accessories: List.Item.Accessory[] = [
    ...(shortcut.isFavorite ? [{ icon: Icon.Star, tooltip: "Favorite" }] : []),
    ...(shortcut.isGlobal
      ? [
          {
            tag: { value: "Global", color: Color.Blue },
            tooltip: "Global Shortcut",
          },
        ]
      : []),
    ...stepTags,
  ];

  const formatted = shortcut.steps.map(formatStep).join(" → ");

  return (
    <List.Item
      title={shortcut.title}
      subtitle={subtitle}
      keywords={keywordsForSteps(shortcut.steps)}
      accessories={accessories}
      actions={
        <ActionPanel>
          <Action.CopyToClipboard title="Copy Shortcut" content={formatted} />
          <Action title="Open in Kommand" onAction={openKommand} />
        </ActionPanel>
      }
    />
  );
}

export function KommandNotInstalledView() {
  return (
    <List>
      <List.EmptyView
        title="Kommand Not Found"
        description="Install Kommand from the Mac App Store to use this extension."
        actions={
          <ActionPanel>
            <Action.OpenInBrowser
              title="Open Mac App Store"
              url="https://apps.apple.com/app/kommand/id6752623076"
            />
          </ActionPanel>
        }
      />
    </List>
  );
}

// ── Helpers ─────────────────────────────────────────────────────────────

export interface CategorySection {
  name: string;
  shortcuts: KommandShortcut[];
}

export function groupByCategory(shortcuts: KommandShortcut[]): {
  favorites: KommandShortcut[];
  sections: CategorySection[];
} {
  const favorites = shortcuts.filter((s) => s.isFavorite);

  const categoryMap = new Map<
    string,
    { isDefault: boolean; shortcuts: KommandShortcut[] }
  >();
  for (const s of shortcuts) {
    const key = s.categoryName;
    if (!categoryMap.has(key)) {
      categoryMap.set(key, { isDefault: s.categoryIsDefault, shortcuts: [] });
    }
    categoryMap.get(key)!.shortcuts.push(s);
  }

  const named: CategorySection[] = [];
  let uncategorized: CategorySection | null = null;

  for (const [name, group] of categoryMap) {
    const section = { name, shortcuts: group.shortcuts };
    if (group.isDefault) {
      uncategorized = section;
    } else {
      named.push(section);
    }
  }

  named.sort((a, b) => a.name.localeCompare(b.name));
  if (uncategorized) {
    named.push(uncategorized);
  }

  return { favorites, sections: named };
}
