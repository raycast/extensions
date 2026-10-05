// Apps whose "tabs" are rows in an in-window list (chat sessions, conversations), read through Accessibility.
// Each app is a SidebarSpec passed to sidebarSource() (see muse.ts), or read with readSidebar() (claude.ts). These depend on the app's UI
// structure, so an app update can break them: when no rows are found, the app's windows are listed instead.

import {
  TabGoneError,
  type App,
  type Platform,
  type SidebarQuery,
  type SidebarRow,
  type Tab,
  type TabKind,
  type TabSource,
} from "../model";
import { windows } from "./windows";

export interface SidebarSpec extends SidebarQuery {
  id: string;
  bundleId: string;
  kind: TabKind;
  /**
   * "status-prefixed": rows titled "<status> <name>" with the name as inner text (Claude); rows without such a
   * prefix (New, Routines...) are skipped. "plain": the title is the name (after namePattern).
   */
  format: "status-prefixed" | "plain";
  /** Row names that aren't entries (headings, "New ..." buttons). */
  skip?: string[];
  /** Description or title suffix of an element naming the open row, for apps whose rows don't report selection
   * (Claude, Muse). */
  activeSuffix?: string;
}

export interface SidebarRef {
  name: string;
}

/** A row's name with app-added state removed (see SidebarQuery.namePattern). */
export function rowName(spec: SidebarSpec, title: string): string {
  if (!spec.namePattern) return title;
  return new RegExp(spec.namePattern).exec(title)?.[1] ?? title;
}

export function fromRows(app: App, spec: SidebarSpec, rows: SidebarRow[], activeName?: string): Tab<SidebarRef>[] {
  return rows.flatMap((row): Tab<SidebarRef>[] => {
    let name = rowName(spec, row.title);
    let status: string | undefined;
    if (spec.format === "status-prefixed") {
      if (!row.text || row.title.length <= row.text.length || !row.title.endsWith(row.text)) return [];
      name = row.text;
      status = row.title.slice(0, -row.text.length).trim();
    }
    if (spec.skip?.includes(name)) return [];
    return [
      {
        key: `${app.bundleId}:row:${name}`,
        app,
        source: spec.id,
        kind: spec.kind,
        title: name,
        detail: status,
        active: activeName !== undefined ? name === activeName : row.selected,
        ref: { name },
      },
    ];
  });
}

/** The sidebar's entries, or [] if it's hidden or not found. */
export async function readSidebar(app: App, spec: SidebarSpec, platform: Platform): Promise<Tab<SidebarRef>[]> {
  const [rows, active] = await Promise.all([
    platform.sidebarRows(app.bundleId, spec),
    spec.activeSuffix ? platform.labelWithSuffix(app.bundleId, spec.activeSuffix) : undefined,
  ]);
  return fromRows(app, spec, rows, active);
}

export async function openSidebarEntry(tab: Tab<SidebarRef>, spec: SidebarSpec, platform: Platform): Promise<void> {
  if (!(await platform.openSidebarRow(tab.app.bundleId, spec, tab.ref.name))) {
    throw new TabGoneError("No longer in the sidebar");
  }
}

export function sidebarSource(spec: SidebarSpec): TabSource {
  const source: TabSource<SidebarRef> = {
    id: spec.id,
    bundleIds: [spec.bundleId],
    list: async (app, platform) => {
      const tabs = await readSidebar(app, spec, platform);
      // Sidebar hidden or not found (e.g. the app's UI changed): offer its windows instead.
      return tabs.length > 0 ? tabs : ((await windows.list(app, platform)) as Tab[] as Tab<SidebarRef>[]);
    },
    // Fallback entries carry source "windows", so their selection is routed there, not here.
    select: (tab, platform) => openSidebarEntry(tab, spec, platform),
  };
  return source;
}
