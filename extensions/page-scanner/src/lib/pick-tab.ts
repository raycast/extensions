/**
 * Which tab "the current tab" is, from what `page-scanner tabs` lists.
 *
 * The bridge says which tab is active in each window and which window has focus, but while
 * Raycast is in front no browser window has focus, and it does not say which window was in
 * front before. With one window that does not matter. With several, the caller asks the
 * browser for the address in its front window (AppleScript) and passes it here as `frontUrl`.
 * Kept free of @raycast/api so it can be tested outside Raycast.
 */
import type { TabsAnswer } from './cli';

type Tab = TabsAnswer['tabs'][number];

export type TabPick =
  | { kind: 'tab'; tab: Tab }
  /** Several windows, and nothing to tell their active tabs apart: ask for `frontUrl`. */
  | { kind: 'ambiguous'; candidates: Tab[] }
  | { kind: 'none' };

export function pickTab(list: Pick<TabsAnswer, 'windows' | 'tabs'>, frontUrl?: string): TabPick {
  // A popup or an app window is not where someone reads a page.
  const normal = new Set(
    list.windows.filter((window) => window.windowType === 'normal').map((w) => w.windowId),
  );
  const active = list.tabs.filter((tab) => tab.active && normal.has(tab.windowId));
  if (active.length === 0) return { kind: 'none' };

  const focused = list.windows.find((window) => window.focused && normal.has(window.windowId));
  const inFocused = focused && active.find((tab) => tab.windowId === focused.windowId);
  if (inFocused) return { kind: 'tab', tab: inFocused };
  if (active.length === 1) return { kind: 'tab', tab: active[0]! };

  if (frontUrl !== undefined) {
    // Two windows on the same address are the same page to scan, so the first will do.
    const match = active.find((tab) => tab.url === frontUrl);
    if (match) return { kind: 'tab', tab: match };
  }
  return { kind: 'ambiguous', candidates: active };
}
