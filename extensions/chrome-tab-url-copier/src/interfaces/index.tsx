import { ReactNode } from "react";
import { Image } from "@raycast/api";
import { getFavicon } from "@raycast/utils";

export interface Preferences {
  readonly useOriginalFavicon: boolean;
  readonly openTabInProfile: SettingsProfileOpenBehaviour;
  readonly profilePath: string;
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
    public readonly windowsId: number,
    public readonly tabIndex: number,
    public readonly isActive: boolean,
    public readonly sourceLine: string,
  ) {}

  static parse(line: string): Tab {
    const parts = line.split(this.TAB_CONTENTS_SEPARATOR);

    return new Tab(parts[0], parts[1], parts[2], +parts[3], +parts[4], parts[5] === "1", line);
  }

  key(): string {
    return `${this.windowsId}${Tab.TAB_CONTENTS_SEPARATOR}${this.tabIndex}`;
  }

  urlWithoutScheme(): string {
    try {
      return this.url.replace(/(^\w+:|^)\/\//, "").replace("www.", "");
    } catch {
      // Fallback for any unexpected errors
      return this.url;
    }
  }

  realFavicon(): string {
    try {
      return new URL(this.favicon || "/favicon.ico", this.url).href;
    } catch {
      // Fallback for invalid URLs (e.g., javascript:, data:, etc.)
      return this.favicon || "";
    }
  }

  googleFavicon(): Image.ImageLike {
    try {
      return getFavicon(this.url);
    } catch {
      // Fallback for invalid URLs
      return { source: "" };
    }
  }
}
