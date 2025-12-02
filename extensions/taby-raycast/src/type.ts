interface BaseEntity {
  id: number;
  createdAt?: number;
}

export interface iCard extends BaseEntity {
  title: string;
  url: string;
  description: string;
  faviconId?: number;
  windowId?: number;
  oldIndex?: number;
}

export interface Space extends BaseEntity {
  title: string;
  order: number;
  icon?: string;
}

export interface Collection extends BaseEntity {
  title: string;
  spaceId: number;
  order: number;
  labelIds: number[];
}

export interface Label extends BaseEntity {
  title: string;
  color: string;
}

export interface Card extends BaseEntity {
  title: string;
  customTitle?: string;
  customDescription?: string;
  url: string;
  description: string;
  collectionId: number;
  order: number;
  windowId?: number;
  faviconId?: number;
  favicon?: string;
}

export interface CollectionWithCards extends Collection {
  cards: Card[];
  labels: Label[];
}

export interface SpaceWithCollections extends Space {
  collections: Collection[];
}

export interface Favicon {
  id: number;
  url: string;
}

export interface SyncData {
  spaces: Space[];
  collections: Collection[];
  labels: Label[];
  cards: Card[];
  favicons: Favicon[];
}

export interface iOption {
  label: string;
  value: number;
}
export interface SyncTokenData {
  accessToken: string | undefined;
  gistId: string | undefined;
}
export type iOptions = iOption[];
export type movePosition = "HEAD" | "END";
export type layoutMode = "collapse" | "expand" | "hover";

export type iSetting = {
  language: "zh-CN" | "en-US";
  theme: "light" | "dark";
  openInNewWindow: boolean;
  hideRightClickMenu: boolean;
  saveAfterOperationTime: number;
  openCardsInGroup: boolean;
  shortcutSettings: {
    saveAllTabs: string;
    saveAllTabsAndClose: string;
    closeDuplicateTabs: string;
    closeAllTabs: string;
    globalSearch: string;
    openTagFilter: string;
  };
};

export interface ExportSpace {
  title: string;
  icon: string;
  collections: {
    title: string;
    labels: {
      title: string;
      color: string;
    }[];
    cards: {
      title: string;
      url: string;
      description: string;
      favicon: string;
    }[];
  }[];
}

export interface GistVersion {
  version: string;
  committedAt: string;
  url: string;
}
