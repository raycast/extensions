export interface BookmarkEntry {
  readonly id: string;
  readonly url: string;
  readonly title: string;
  readonly lastVisited: Date;
}

export interface BookmarkDirectory {
  readonly id: string;
  readonly name: string;
  readonly type: "folder" | "url";
  readonly url?: string;
  readonly date_added: string;
  readonly children: BookmarkDirectory[];
}

export interface RawBookmarks {
  readonly roots: {
    readonly [key: string]: BookmarkDirectory;
  };
}
