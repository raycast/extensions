import { getPreferenceValues } from "@raycast/api";
import { normalizeText, normalizeWorkspaceRoots, normalizeExtensions, splitLowerList } from "@lib/utils";

/** Normalized values from the extension-level Raycast configuration. */
export type ExtensionPreferences = {
  workspaceRoots: string[];
  excludedWorkspaces: Set<string>;
  excludedFoldersInWorkspaces: Set<string>;
};

/**
 * Returns the normalized extension-level configuration.
 *
 * Workspace roots become absolute paths. Excluded workspace and directory names become
 * lowercase sets.
 */
export function extensionPreferences(): ExtensionPreferences {
  const prefs = getPreferenceValues<Preferences>();
  const workspaceRoots = normalizeWorkspaceRoots(prefs.workspaceRoots);
  const excludedFoldersInWorkspaces = splitLowerList(prefs.excludedFoldersInWorkspaces);
  const excludedWorkspaces = splitLowerList(prefs.excludedWorkspaces);

  return {
    workspaceRoots,
    excludedWorkspaces,
    excludedFoldersInWorkspaces,
  };
}

/**
 * Returns preferences for note counts, pinned ordering, content search, and the preview panel.
 *
 * An unset `previewNotesByDefault` preference is normalized to `false`.
 */
export function searchNotesPreferences() {
  const preferences = getPreferenceValues<Preferences.SearchNotes>();

  return {
    showWorkspaceNoteCount: preferences.showWorkspaceNoteCount,
    showPinnedNotesFirst: preferences.showPinnedNotesFirst,
    searchContent: preferences.searchContent,
    previewNotesByDefault: Boolean(preferences.previewNotesByDefault),
  };
}

/**
 * Returns the configuration used by the Search Attachments command.
 *
 * Excluded extensions are lowercase and do not include a leading dot.
 */
export function searchAttachmentsPreferences() {
  const { showWorkspaceAttachmentCount, flattenWorkspaceSections, listViewByDefault, excludeFileExtensions } =
    getPreferenceValues<Preferences.SearchAttachments>();
  const excludedExtensions = normalizeExtensions(excludeFileExtensions);

  return {
    showWorkspaceAttachmentCount,
    flattenWorkspaceSections,
    listViewByDefault: Boolean(listViewByDefault),
    excludedExtensions,
  };
}

/**
 * Returns the configuration used by the Open Daily Desk Note command.
 *
 * The default workspace is normalized. The last workspace setting is enabled unless the
 * user sets it to false.
 */
export function openDailyDeskNotePreferences() {
  const preferences = getPreferenceValues<Preferences.OpenDailyDeskNote>();

  return {
    defaultWorkspace: normalizeText(preferences.defaultWorkspace),
    showFilename: Boolean(preferences.showFilename),
    useLastWorkspace: preferences.useLastWorkspace !== false,
  };
}
