import { ZoteroItemData } from "./types";

/**
 * Utility functions for formatting Zotero item data.
 * This module provides helper functions to process and format Zotero metadata.
 */
export class ZoteroClient {
  static formatAuthors(creators: ZoteroItemData["creators"]): string {
    if (!creators || creators.length === 0) return "Unknown Author";
    return creators
      .map(
        (creator) =>
          creator.name ||
          `${creator.firstName || ""} ${creator.lastName || ""}`.trim(),
      )
      .join(", ");
  }

  static extractYear(dateString?: string): string {
    if (!dateString) return "";
    const match = dateString.match(/\d{4}/);
    return match ? match[0] : dateString;
  }

  static formatItemType(type?: string): string {
    if (!type) return "";
    return type
      .replace(/([A-Z])/g, " $1")
      .replace(/^./, (str) => str.toUpperCase())
      .trim();
  }
}
