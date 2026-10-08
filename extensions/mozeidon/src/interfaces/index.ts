import { Image } from "@raycast/api";
import { getFavicon } from "@raycast/utils";
import { ReactNode } from "react";
import { TAB_TYPE } from "../constants";

export interface Preferences {
  readonly searchEngine: string;
}

export class Tab {
  constructor(
    public readonly id: string,
    public readonly pinned: boolean,
    public readonly windowId: number,
    public readonly title: string,
    public readonly url: string,
    public readonly domain: string,
    public readonly active: boolean,
  ) {}

  urlWithoutScheme(): string {
    return this.url.replace(/(^\w+:|^)\/\//, "").replace("www.", "");
  }

  googleFavicon(): Image.ImageLike {
    return getFavicon(this.url, { mask: Image.Mask.RoundedRectangle });
  }
}

export interface MozeidonTab {
  id: number;
  windowId: number;
  pinned: boolean;
  domain: string;
  title: string;
  url: string;
  active: boolean;
}

export interface MozeidonBookmark {
  id: string;
  parent: string;
  title: string;
  url: string;
}

export interface TabState {
  type: TAB_TYPE;
  tabs: Tab[];
}

export interface SearchResult<T> {
  data: T;
  errorView?: ReactNode;
  isLoading: boolean;
}
