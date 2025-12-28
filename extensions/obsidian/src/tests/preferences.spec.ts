import { expect, describe, it } from "vitest";
import {
  parseFolderActionsPreferences,
  parseTagsPreferences,
  parseExcludedFoldersPreferences,
} from "../api/preferences/preferences.service";

describe("preferences service", () => {
  describe("parseFolderActionsPreferences", () => {
    it("should return empty array for empty values", () => {
      expect(parseFolderActionsPreferences("")).toEqual([]);
    });

    it("should parse single folder action", () => {
      expect(parseFolderActionsPreferences("folder1")).toEqual(["folder1"]);
      expect(parseFolderActionsPreferences(" folder1 ")).toEqual(["folder1"]);
    });

    it("should parse multiple folder actions", () => {
      expect(parseFolderActionsPreferences("folder1,folder2")).toEqual(["folder1", "folder2"]);
      expect(parseFolderActionsPreferences("folder1, folder2")).toEqual(["folder1", "folder2"]);
      expect(parseFolderActionsPreferences("folder1 , folder2 , folder3")).toEqual(["folder1", "folder2", "folder3"]);
    });

    it("should handle folder paths", () => {
      expect(parseFolderActionsPreferences("path/to/folder1,path/to/folder2")).toEqual([
        "path/to/folder1",
        "path/to/folder2",
      ]);
    });

    it("should filter out empty values", () => {
      expect(parseFolderActionsPreferences("folder1,,folder2")).toEqual(["folder1", "folder2"]);
      expect(parseFolderActionsPreferences(",folder1,folder2,")).toEqual(["folder1", "folder2"]);
      expect(parseFolderActionsPreferences(",,")).toEqual([]);
    });
  });

  describe("parseTagsPreferences", () => {
    it("should return empty array for empty values", () => {
      expect(parseTagsPreferences("")).toEqual([]);
    });

    it("should parse single tag", () => {
      expect(parseTagsPreferences("tag1")).toEqual(["tag1"]);
      expect(parseTagsPreferences(" tag1 ")).toEqual(["tag1"]);
    });

    it("should parse multiple tags", () => {
      expect(parseTagsPreferences("tag1,tag2")).toEqual(["tag1", "tag2"]);
      expect(parseTagsPreferences("tag1, tag2")).toEqual(["tag1", "tag2"]);
      expect(parseTagsPreferences("tag1 , tag2 , tag3")).toEqual(["tag1", "tag2", "tag3"]);
    });

    it("should handle tags with special characters", () => {
      expect(parseTagsPreferences("tag-1,tag_2,tag/nested")).toEqual(["tag-1", "tag_2", "tag/nested"]);
    });

    it("should filter out empty values", () => {
      expect(parseTagsPreferences("tag1,,tag2")).toEqual(["tag1", "tag2"]);
      expect(parseTagsPreferences(",tag1,tag2,")).toEqual(["tag1", "tag2"]);
      expect(parseTagsPreferences(" , tag1 , , tag2 , ")).toEqual(["tag1", "tag2"]);
    });
  });

  describe("parseExcludedFoldersPreferences", () => {
    it("should return empty array for empty values", () => {
      expect(parseExcludedFoldersPreferences("")).toEqual([]);
    });

    it("should parse single excluded folder", () => {
      expect(parseExcludedFoldersPreferences("Archive")).toEqual(["Archive"]);
      expect(parseExcludedFoldersPreferences(" Archive ")).toEqual(["Archive"]);
    });

    it("should parse multiple excluded folders", () => {
      expect(parseExcludedFoldersPreferences("Archive,Templates")).toEqual(["Archive", "Templates"]);
      expect(parseExcludedFoldersPreferences("Archive, Templates, Private")).toEqual([
        "Archive",
        "Templates",
        "Private",
      ]);
    });

    it("should handle folder paths with slashes", () => {
      expect(parseExcludedFoldersPreferences("path/to/Archive,another/path/Templates")).toEqual([
        "path/to/Archive",
        "another/path/Templates",
      ]);
    });

    it("should handle hidden folders", () => {
      expect(parseExcludedFoldersPreferences(".obsidian,.git,.trash")).toEqual([".obsidian", ".git", ".trash"]);
    });

    it("should filter out empty values", () => {
      expect(parseExcludedFoldersPreferences("Archive,,Templates")).toEqual(["Archive", "Templates"]);
      expect(parseExcludedFoldersPreferences(",Archive,Templates,")).toEqual(["Archive", "Templates"]);
      expect(parseExcludedFoldersPreferences(",,")).toEqual([]);
    });

    it("should handle mixed spaces and commas", () => {
      expect(parseExcludedFoldersPreferences(" Archive , Templates , Private ")).toEqual([
        "Archive",
        "Templates",
        "Private",
      ]);
    });
  });
});
