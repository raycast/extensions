import { bookmarkNote, unbookmarkNote } from "./internal/bookmarks";
import { appendText, createProperties, deleteNote, Note, writeMarkdown } from "./internal/notes";
import {
  getVaultsFromPreferences,
  getVaultsFromObsidianJson,
  getVaultsFromPreferencesOrObsidianJson,
  ObsidianTarget,
  getObsidianTarget,
  validateNotePath,
} from "./internal/obsidian";
import { readCommunityPlugins, readCorePlugins, VaultPluginCheckParams, vaultPluginCheck } from "./internal/plugins";
import {
  getNoteFileContent,
  getNotes,
  getMedia,
  getExcludedFolders,
  getMarkdownFilePaths,
  getCanvasFilePaths,
  ObsidianVault,
} from "./internal/vault";
import { inlineTagsForString, tagsForString, yamlPropertyForString, yamlTagsForString } from "./internal/yaml";

export type { Note, NoteWithContent } from "./internal/notes";
export type { ObsidianVault } from "./internal/vault";
export { ObsidianTargetType } from "./internal/obsidian";

export const Vault = {
  readMarkdown(path: string, filter?: (input: string) => string) {
    return getNoteFileContent(path, filter);
  },

  writeMarkdown(
    path: string,
    name: string,
    text: string,
    onDirectoryCreationFailed?: (filePath: string) => void,
    onFileWriteFailed?: (filePath: string, fileName: string) => void
  ) {
    writeMarkdown(path, name, text, onDirectoryCreationFailed, onFileWriteFailed);
  },

  readCommunityPlugins(path: string) {
    return readCommunityPlugins(path);
  },

  readCorePlugins(path: string) {
    return readCorePlugins(path);
  },

  checkPlugins(params: VaultPluginCheckParams) {
    return vaultPluginCheck(params);
  },

  getExcludedFolders(path: string, configFileName: string) {
    return getExcludedFolders(path, configFileName);
  },

  getMarkdownFilePaths(path: string, configFileName: string, excludedFolders: string[]) {
    return getMarkdownFilePaths(path, configFileName, excludedFolders);
  },

  getCanvasFilePaths(path: string, configFileName: string, excludedFolders: string[]) {
    return getCanvasFilePaths(path, configFileName, excludedFolders);
  },

  getNotes(path: string, configFileName: string, excludedFolders: string[]) {
    return getNotes(path, configFileName, excludedFolders);
  },

  getMedia(path: string, configFileName: string, excludedFolders: string[]) {
    return getMedia(path, configFileName, excludedFolders);
  },

  getNote(path: string, filter?: (input: string) => string) {
    return getNoteFileContent(path, filter);
  },

  bookmarkNote(path: string, note: Note, configFileName: string) {
    bookmarkNote(path, note, configFileName);
  },

  unbookmarkNote(path: string, note: Note, configFileName: string) {
    unbookmarkNote(path, note, configFileName);
  },

  deleteNote(note: Note) {
    return deleteNote(note);
  },

  appendToNote(note: Note, content: string) {
    appendText(note.path, content);
  },
};

/**
 * This is a pure Obsidian API. It should not be responsible for any Raycast specific functions.
 */
export const Obsidian = {
  getVaultsFromPreferences() {
    return getVaultsFromPreferences();
  },

  getVaultsFromObsidianJson() {
    return getVaultsFromObsidianJson();
  },

  getVaultsFromPreferencesOrObsidianJson() {
    return getVaultsFromPreferencesOrObsidianJson();
  },

  getTarget(target: ObsidianTarget) {
    return getObsidianTarget(target);
  },

  validateNotePath(notePath: string, vaults: ObsidianVault[]) {
    return validateNotePath(notePath, vaults);
  },
};

export const ObsidianUtils = {
  createProperties(tags: string[]) {
    createProperties(tags);
  },

  getInlineTags(str: string) {
    return inlineTagsForString(str);
  },

  getProperty(str: string, property: string) {
    return yamlPropertyForString(str, property);
  },

  getPropertiesTags(str: string) {
    return yamlTagsForString(str);
  },

  getAllTags(str: string) {
    return tagsForString(str);
  },
};
