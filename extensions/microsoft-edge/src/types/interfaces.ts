import { ReactNode } from "react";
import { Image } from "@raycast/api";
import { getFavicon } from "@raycast/utils";

export interface Preferences {
  readonly useDev: boolean;
  readonly buildChoice: SettingsBuildChoice;
  readonly openTabInProfile: SettingsProfileOpenBehaviour;
}

export enum SettingsBuildChoice {
  Stable = "stable",
  Dev = "dev",
  Beta = "beta",
  Canary = "canary",
}

export enum SettingsProfileOpenBehaviour {
  Default = "default",
  ProfileCurrent = "profile_current",
  ProfileOriginal = "profile_original",
}

export interface SearchResult<T> {
  readonly isLoading: boolean;
  readonly errorView?: ReactNode;
  readonly data?: T[];
  readonly revalidate?: (profileId: string) => void;
}

export interface HistoryEntry {
  readonly id: string;
  readonly url: string;
  readonly title: string;
  readonly lastVisited: Date;
}

export type GroupedEntries = Map<string, HistoryEntry[]>;

export class Tab {
  static readonly TAB_CONTENTS_SEPARATOR: string = "~~~";

  constructor(
    public readonly title: string,
    public readonly url: string,
    public readonly favicon: string,
    public readonly windowsIndex: number,
    public readonly tabIndex: number,
  ) {}

  static parse(line: string): Tab {
    const parts = line.split(this.TAB_CONTENTS_SEPARATOR);

    return new Tab(parts[0], parts[1], parts[2], +parts[3], +parts[4]);
  }

  key(): string {
    return `${this.windowsIndex}${Tab.TAB_CONTENTS_SEPARATOR}${this.tabIndex}`;
  }

  urlWithoutScheme(): string {
    return this.url.replace(/(^\w+:|^)\/\//, "").replace("www.", "");
  }

  googleFavicon(): Image.ImageLike {
    return getFavicon(this.url);
  }
}

type BookmarkNodeType = "folder" | "url";

export interface BookmarkDirectory {
  date_added: string;
  children: BookmarkDirectory[];
  type: BookmarkNodeType;
  id: string;
  guid: string;
  source?: string;
  url?: string;
  name: string;
  [key: string]: unknown;
}

export interface RawBookmarkRoot {
  [key: string]: BookmarkDirectory;
}

export interface RawBookmarks {
  roots: RawBookmarkRoot;
  [key: string]: unknown;
}

export interface WorkspaceCache {
  edgeWorkspaceCacheVersion: number;
  workspaces: Workspace[];
}

export interface Workspace {
  /**
   * if the workspace window is opened
   */
  accent: boolean;
  /**
   * if the opened workspace window is in macOS visible|active space
   */
  active: boolean;

  collaboratorsCount: number;

  color: WorkspaceColor;

  connectionUrl: string;
  count: number;
  edgeWorkspaceVersion: number;

  id: string;

  isOwner: boolean;
  isolated: boolean;
  last_active_time: number;

  /**
   * @example "124 tabs"
   */
  menuSubtitle: string;

  name: string;

  shared: boolean;
  showDisconnectedUI: boolean;

  /**
   * @example 2 | 0
   */
  workspaceFluidStatus: number;
}

export enum WorkspaceColor {
  Blue = 0,
  Cyan = 1,
  Tea = 2,
  Red = 3,
  Gray = 4,
  Yellow = 5,
  Zinc = 6,
  Orange = 7,
  Amber = 8,
  Pink = 9,
  Purple = 10,
  Green = 11,
  Transparent = 12,
  Slate = 13,
}

/**
 * Hex color map for Edge Workspaces
 *
 * Use Color Picker to get the real values from Edge in the dark mode, the light mode colors are different. So maybe we should add light mode colors later.
 */
export const workspaceHexMap: Record<WorkspaceColor, string> = {
  [WorkspaceColor.Blue]: "#69A0FA",
  [WorkspaceColor.Cyan]: "#58D3DC",
  [WorkspaceColor.Tea]: "#A3E635",
  [WorkspaceColor.Red]: "#EE5FB7",
  [WorkspaceColor.Gray]: "#9D9B99",
  [WorkspaceColor.Yellow]: "#FEB967",
  [WorkspaceColor.Zinc]: "#DFDFDF",
  [WorkspaceColor.Orange]: "#E9835E",
  [WorkspaceColor.Amber]: "#DE8E63",
  [WorkspaceColor.Pink]: "#CF87DA",
  [WorkspaceColor.Purple]: "#AB84FF",
  [WorkspaceColor.Green]: "#5AE0A0",
  [WorkspaceColor.Transparent]: "#00000000",
  [WorkspaceColor.Slate]: "#C7DCED",
};

export interface ExecError extends Error {
  code: number;
  stdout: string;
  stderr: string;
}

export interface EdgeProfile {
  readonly name: string;
  readonly id: string;
}
