import { BookmarkSortOrder } from "./interfaces";

export const defaultCometProfilePath = ["Application Support", "Comet"];
export const defaultCometStatePath = ["Application Support", "Comet", "Local State"];
export const DEFAULT_COMET_PROFILE_ID = "Default";
export const COMET_PROFILE_KEY = "COMET_PROFILE_KEY";
export const COMET_ICON = "comet-icon.png";
export const COMET_BOOKMARK_SORT_ORDER = "BOOKMARK_SORT_ORDER";
export const DEFAULT_COMET_BOOKMARK_SORT_ORDER = "AddedAsc";
export const COMET_BOOKMARK_SORT_ORDERS: Record<BookmarkSortOrder, string> = {
  AddedAsc: "Date Added (ASC)",
  AddedDes: "Date Added (DES)",
};

export const NOT_INSTALLED_MESSAGE = "Comet browser not installed";
export const NO_BOOKMARKS_MESSAGE = "No bookmarks found in this profile";
