/**
 * User-facing UI strings (English only)
 */
export const t = {
  // Common & Errors
  errorTitle: "Something Went Wrong",
  loadFoldersError: "Couldn't load your folders.",
  saveFolderError: "Couldn't save folder changes.",
  scanAppsError: "Couldn't scan installed applications.",

  // Section Headers
  openSection: "Open",
  launchSection: "Open",
  appManagementSection: "Manage Apps",
  folderManagementSection: "Manage Folder",
  quickLaunchSection: "Quick Launch",
  quickOpenSection: "Quick Open",
  backupSection: "Backup & Restore",

  // Dashboard & Navigation
  allFoldersTitle: "App Folders",
  searchFoldersPlaceholder: "Search folders or apps...",
  searchFolderAppsPlaceholder: (name: string) => `Search in ${name}...`,
  emptyFoldersTitle: "No Folders Yet",
  emptyFoldersDesc: "Press Enter to create your first app folder.",
  createFolder: "New Folder",
  openFolder: "Open Folder",
  folderSettings: "Edit Folder",
  deleteFolder: "Delete Folder",
  deleteFolderConfirmTitle: (name: string) => `Delete "${name}"?`,
  deleteFolderConfirmMessage:
    "This only removes the folder from Raycast. Your installed Mac apps won't be affected.",
  delete: "Delete",
  folderDeleted: "Folder Deleted",
  loadFoldersErrorTitle: "Failed to Load Folders",
  retry: "Retry",

  // Feature 2: Launch All Apps
  openAllApps: "Open All Apps in Folder",
  launchAllSuccessTitle: "All Apps Opened",
  launchAllSuccessMessage: (count: number, name: string) =>
    `Opened ${count} ${count === 1 ? "app" : "apps"} from "${name}".`,
  launchAllPartialTitle: "Some Apps Couldn't Be Opened",
  launchAllPartialMessage: (opened: number, failedNames: string[]) =>
    `Opened ${opened} ${opened === 1 ? "app" : "apps"}. Failed: ${failedNames.join(", ")}.`,
  launchAllFailedTitle: "Couldn't Open Apps",
  launchAllFailedMessage: (failedNames: string[]) =>
    `Make sure ${failedNames.join(", ")} ${failedNames.length === 1 ? "is" : "are"} still installed on your Mac.`,
  noAppsToLaunch: "This folder has no apps to open.",

  // Folder Grid View
  emptyFolderTitle: (name: string) => `"${name}" is Empty`,
  emptyFolderDesc: "Press Enter to add apps to this folder.",
  launchApp: (name: string) => `Open ${name}`,
  launchFailedTitle: "Couldn't Open App",
  launchFailedMessage: (name: string) =>
    `Make sure ${name} is still installed on your Mac.`,
  addApp: "Add or Remove Apps",
  moveLeft: "Move Left",
  moveRight: "Move Right",
  moveUp: "Move Up",
  moveDown: "Move Down",
  removeApp: "Remove from Folder",
  appRemovedTitle: "Removed from Folder",
  appRemovedMessage: (name: string) => `${name} was removed.`,
  back: "Back to Folders",
  appsCount: (count: number) => `${count} ${count === 1 ? "app" : "apps"}`,

  // Feature 4: Move App to Another Folder
  moveToFolder: "Move to Another Folder...",
  appMovedTitle: "App Moved",
  appMovedMessage: (appName: string, targetName: string) =>
    `Moved "${appName}" to "${targetName}".`,

  // Forms & Feature 3: Preview Style
  folderName: "Folder Name",
  folderNamePlaceholder: "e.g. Microsoft, Design, Utilities",
  folderIcon: "Folder Icon",
  folderIconDesc:
    "Choose a custom image (.png, .ico, .icns), or leave empty to use the transparent app box style.",
  folderPreviewStyle: "Folder Thumbnail Style",
  previewStyleAuto: "App Box (Show mini app icons in a translucent box)",
  previewStylePlain: "Plain Folder (Classic macOS folder)",
  folderPreviewStyleDesc:
    "When no custom image is selected, choose whether to show mini app icons inside a translucent container or a classic folder.",
  folderIconEmoji: "Emoji Prefix",
  folderIconEmojiPlaceholder: "Optional (leave blank for folder name only)",
  folderIconEmojiInfo:
    "Tip: Press Control + Command + Space (⌃⌘Space) to open the macOS emoji viewer.",
  resetToDefaultIcon: "Reset to Default Folder Icon",
  shortcutSlot: "Shortcut Slot",
  noSlot: "None (Open from All App Folders)",
  slotN: (n: number) => `Slot ${n} (App Folder ${n})`,
  slotAvailable: (n: number) => `Slot ${n} — Available`,
  slotOccupied: (n: number, folderName: string) =>
    `Slot ${n} — Used by "${folderName}"`,
  slotCurrent: (n: number) => `Slot ${n} — Currently assigned`,
  slotDesc:
    "Assign a slot (1–5) to open this folder from anywhere using a global hotkey in Raycast Settings → Extensions → App Folders.",
  createFolderSubmit: "Create Folder",
  saveSettingsSubmit: "Save Changes",
  nameRequiredError: "Please enter a folder name.",
  folderCreatedTitle: "Folder Created",
  folderCreatedMessage: (name: string, slot?: number) =>
    `"${name}" is ready${slot ? ` (Slot ${slot})` : ""}.`,
  folderUpdatedTitle: "Changes Saved",
  folderUpdatedMessage: (name: string) => `Updated "${name}".`,

  // Add App View
  addAppSearchPlaceholder: "Search apps...",
  addAppSectionTitle: (name: string) => `Apps for "${name}"`,
  addToFolder: "Add to Folder (Keep Open)",
  removeFromFolder: "Remove from Folder (Keep Open)",
  addAndReturn: "Add & Return to Folder",
  doneReturnToFolder: "Done",
  alreadyAdded: "Added",
  canAdd: "Add",
  appAddedTitle: "Added to Folder",
  appAddedMessage: (appName: string, folderName: string) =>
    `Added ${appName} to "${folderName}".`,

  // Empty Slot
  emptySlotTitle: (slot: number) => `Slot ${slot} is Empty`,
  emptySlotDesc: "Press Enter to create a folder for this shortcut slot.",
  createSlotFolder: (slot: number) => `Create Folder in Slot ${slot}`,

  // Feature 6: Backup & Restore
  exportBackup: "Export Backup to Clipboard",
  exportSuccessTitle: "Backup Copied to Clipboard",
  exportSuccessMessage: (count: number) =>
    `Exported ${count} ${count === 1 ? "folder" : "folders"} configuration to clipboard.`,
  importBackup: "Import Backup from JSON",
  importBackupTitle: "Import App Folders Backup",
  importBackupDesc:
    "Paste your exported JSON backup data below. You can merge with existing folders or overwrite them completely.",
  importJsonField: "Backup JSON Data",
  importJsonPlaceholder:
    'Paste JSON here (e.g. [{"name": "Utilities", "apps": [...]}])...',
  importMode: "Import Mode",
  importModeMerge: "Merge (Add missing folders and apps)",
  importModeReplace: "Replace (Overwrite all current folders)",
  importSubmit: "Restore Folders",
  importSuccessTitle: "Backup Restored",
  importSuccessMessage: (count: number) =>
    `Successfully restored ${count} ${count === 1 ? "folder" : "folders"}.`,
  importErrorInvalidJson: "Invalid backup JSON format. Please check your data.",
  resetFoldersAction: "Reset All Folders to Default",
  resetFoldersConfirmTitle: "Reset All Folders to Default?",
  resetFoldersConfirmMessage:
    "This will replace all current folders with the default sample folders. Your installed Mac applications will not be affected.",
  resetFoldersSuccessToast: "Folders reset to default",

  // Seed Data
  seedUtilities: "Utilities",
  seedCustomIconFolder: "You can change folder icons",

  // Shortcut Badges (⌘1–⌘9)
  showShortcutHintsAction: "Show ⌘1–⌘9 Shortcut Badges",
  hideShortcutHintsAction: "Hide ⌘1–⌘9 Shortcut Badges",
  shortcutHintsEnabledToast: "⌘1–⌘9 shortcut badges enabled",
  shortcutHintsDisabledToast: "⌘1–⌘9 shortcut badges hidden",
};
