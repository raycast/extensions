import {
  Action,
  ActionPanel,
  Color,
  Icon,
  List,
  open,
  showHUD,
} from "@raycast/api";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { findKommandAppPath } from "./database";
import type { KeyLabelLookup } from "./key-layout-helper";
import { formatStep, keywordsForSteps, tooltipForStep } from "./keymap";
import { KommandShortcut } from "./types";

export const APP_STORE_URL = "https://apps.apple.com/app/kommand/id6752623076";
const execFileAsync = promisify(execFile);

/** Open Kommand via its installed app bundle, or the App Store if unavailable. */
export async function openKommand(): Promise<void> {
  const appPath = await findKommandAppPath();

  if (appPath) {
    try {
      await execFileAsync("/usr/bin/open", [appPath]);
      return;
    } catch (error) {
      console.error("Failed to open Kommand app bundle:", error);
    }
  }

  await open(APP_STORE_URL);
}

// ── Shared Components ───────────────────────────────────────────────────

export function ShortcutItem({
  shortcut,
  subtitle,
  keyLabels,
}: {
  shortcut: KommandShortcut;
  subtitle?: string;
  keyLabels?: KeyLabelLookup;
}) {
  const stepTags: List.Item.Accessory[] = shortcut.steps.map((step) => ({
    tag: { value: formatStep(step, keyLabels), color: Color.SecondaryText },
    tooltip: tooltipForStep(step, keyLabels),
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

  const formatted = shortcut.steps
    .map((step) => formatStep(step, keyLabels))
    .join(" → ");

  return (
    <List.Item
      title={shortcut.title}
      subtitle={subtitle}
      keywords={keywordsForSteps(shortcut.steps, keyLabels)}
      accessories={accessories}
      actions={
        <ActionPanel>
          <Action
            title="Show Shortcut"
            icon={Icon.Keyboard}
            onAction={() => showHUD(formatted)}
          />
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

export function KommandSetupView() {
  return (
    <List>
      <List.EmptyView
        title="Open Kommand to Finish Setup"
        description="Kommand is installed, but its shortcut library is not available yet. Open the app once, then come back here."
        actions={
          <ActionPanel>
            <Action title="Open Kommand" onAction={openKommand} />
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
  for (const s of shortcuts.filter((s) => !s.isFavorite)) {
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
