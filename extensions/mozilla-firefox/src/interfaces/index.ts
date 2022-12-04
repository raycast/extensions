import { Image } from "@raycast/api";
import { getFavicon } from "@raycast/utils";

export interface State {
  tabs?: Tab[];
}

export class Tab {
  constructor(public readonly title: string, public readonly url: string) {}

  static parse(entry: { url: string; title: string }): Tab {
    return new Tab(entry.title, entry.url);
  }

  urlWithoutScheme(): string {
    return this.url.replace(/(^\w+:|^)\/\//, "").replace("www.", "");
  }

  googleFavicon(): Image.ImageLike {
    return getFavicon(this.url);
  }
}

export interface HistoryEntry {
  id: number;
  url: string;
  title: string;
  lastVisited: Date;
}

export interface HistorySearchResults {
  entries?: HistoryEntry[];
  error?: string;
  isLoading: boolean;
}
