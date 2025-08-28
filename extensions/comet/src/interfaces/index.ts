import { ReactNode } from "react";
import { Image } from "@raycast/api";
import { getFavicon } from "@raycast/utils";

export interface Preferences {
  readonly useOriginalFavicon: boolean;
  readonly profilePath: string;
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
    public readonly sourceLine: string
  ) {}

  static parse(line: string): Tab {
    const parts = line.split(this.TAB_CONTENTS_SEPARATOR);

    if (parts.length < 5) {
      throw new Error(`Invalid tab data: expected at least 5 parts but got ${parts.length}`);
    }

    return new Tab(parts[0], parts[1], parts[2], +parts[3], +parts[4], line);
  }

  key(): string {
    return `${this.windowsId}${Tab.TAB_CONTENTS_SEPARATOR}${this.tabIndex}`;
  }

  urlWithoutScheme(): string {
    return this.url.replace(/(^\w+:|^)\/\//, "").replace("www.", "");
  }

  realFavicon(): string {
    return new URL(this.favicon || "/favicon.ico", this.url).href;
  }

  defaultFavicon(): Image.ImageLike {
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

export interface ExecError extends Error {
  code: number;
  stdout: string;
  stderr: string;
}

export interface CometProfile {
  readonly name: string;
  readonly id: string;
}
