/**
 * 界面文案表:一份 key -> 英文文案 的字典 + 一个 t() 取词函数,{name} 形式的占位符用 vars 参数替换。
 *
 * 只有英文——Raycast 商店只支持美式英语,官方明确不让扩展自带多语言机制。
 * 文案集中放在这里而不是散在组件里,是为了能统一校验宽度(见 test/i18nWidth.test.ts)。
 */

const en = {
  "common.save": "Save",
  "common.cancel": "Cancel",
  "common.fileSizeBytes": "{size} bytes",
  "common.notAFile": "{file} isn't a file (maybe a folder with that name)",
  "common.delete": "Delete",
  "common.saveFailedTitle": "Save Failed",
  "common.searchPlaceholder": "Search...",
  "common.showDataDir": "Show Data Folder in Finder",
  "common.snapshotLimitMessage": "{count} snapshots kept (limit {limit}); clean up old ones",

  "cfg.sectionTitle": "Needs Your Attention",
  "cfg.corruptedTitle": "Config file is damaged",
  "cfg.corruptedDetail":
    "The original was renamed to {name} and still holds your data. Fix its format and rename it back to restore it. Nothing will be written until then.",
  "cfg.tooNewTitle": "Config file is from a newer version",
  "cfg.tooNewDetail":
    "The file is version {version}, but this build of Env Keeper only understands up to {current}. The original was renamed to {name} — update the extension and rename it back to restore it.",
  "cfg.detailsHint": "Press Enter for details",
  "cfg.close": "Close",
  "cfg.showDetails": "Show Details",
  "cfg.showBackup": "Show Original File in Finder",
  "cfg.unreadableTitle": "Config file is unreadable",
  "cfg.unreadableDetail":
    "{name} is still in place but could not be read. Check its permissions. Nothing will be written until it is fixed, so it won't be overwritten.",
  "cfg.notQuarantinedDetail":
    "{name} is damaged and could not be moved aside, so it is still in place. Nothing will be written until it is fixed, so it won't be overwritten.",
  "cfg.writeBlockedUnreadable": "{name} can't be read; nothing was saved. Check permissions",
  "cfg.writeBlockedCorrupted": "{name} is damaged; nothing was saved to protect it",

  "mv.searchPlaceholderProjects": "Search registered projects...",
  "mv.trackTooltip": "Switch Track",
  "mv.trackProjects": "Project Envs (.env Files)",
  "mv.trackShell": "Global Shell (vars & aliases)",
  "mv.sectionTitle": "Registered Projects",
  "mv.sectionSubtitle": "{count} project(s)",
  "mv.envCountAccessory": "{count} env file(s)",
  "mv.noEnvFilesAccessory": "No env files yet",
  "mv.lastOpenedAccessory": "Opened {date}",
  "mv.actionManage": "Manage Environment Variables",
  "mv.actionAddProject": "Register New Project",
  "mv.actionOpenWith": "Open With",
  "mv.actionRemove": "Stop Managing This Project",
  "mv.actionRename": "Rename Project",
  "rp.navTitle": 'Rename "{name}"',
  "rp.description": "Only changes the name shown in Env Keeper. The folder on disk ({path}) is untouched.",
  "rp.nameTitle": "Project Name",
  "rp.nameEmptyError": "Please enter a project name",
  "rp.submitTitle": "Save Name",
  "rp.renamedToast": 'Renamed to "{name}"',
  "mv.missingTag": "Path Missing",
  "mv.missingTooltip": "This folder is gone — it may have been renamed or moved",
  "mv.actionRelocate": "Point to a New Folder",
  "mv.relocateNavTitle": "Point to a New Folder",
  "mv.relocateDescription":
    'Choose the new folder for "{name}". Fields you marked as sensitive and notices you dismissed are kept.',
  "mv.relocateOldPath": "Old Path",
  "mv.relocatePathTitle": "New Project Folder",
  "mv.relocatePathError": "Please choose a folder",
  "mv.relocateSubmit": "Point Here",
  "mv.relocatedToast": "Now pointing at the new folder",
  "mv.removeConfirmTitle": "Remove Project: {name}",
  "mv.removeConfirmMessage":
    "This only removes the project from Env Keeper's list (along with the profiles Env Keeper keeps for it). The folder on disk and its .env files are never deleted.",
  "mv.removeConfirmAction": "Remove",
  "mv.loadRegistryFailedTitle": "Could Not Load Project List",
  "mv.removedToastTitle": "Removed project: {name}",
  "mv.emptyTitle": "No Registered Projects Yet",
  "mv.emptyDesc": "Press Enter or ⌘N to register your first project folder and start managing its env vars.",

  "addProject.description":
    "Choose the project's root folder. Env Keeper will find and manage the .env files inside it.",
  "addProject.pathTitle": "Project Folder",
  "addProject.pathError": "Please choose a project folder",
  "addProject.nameTitle": "Display Name",
  "addProject.namePlaceholder": "Defaults to the folder name",
  "addProject.submitTitle": "Register Project",
  "addProject.successToast": "Registered project: {name}",
  "addProject.failToast": "Failed to Register Project",

  "pd.readFailedTitle": "Failed to Read Env File",
  "pd.secretOnToast": "Marked as sensitive (this project only)",
  "pd.secretOffToast": "Unmarked as sensitive (this project only)",
  "pd.conflictTitle": "File Changed Outside Env Keeper",
  "pd.conflictMessage":
    '{file} was modified by another program while you were editing. Choose "Discard Mine" to drop your changes and load the latest content; choose "Force Overwrite" to overwrite the external changes with yours.',
  "pd.conflictOverwrite": "Force Overwrite",
  "pd.conflictDiscardMine": "Discard Mine",
  "pd.savedToast": "Saved and snapshot created",
  "pd.exampleSuccessTitle": "Generated .env.example",
  "pd.exampleConfirmTitle": "Update .env.example?",
  "pd.exampleConfirmMessage":
    "{added} variables will be added and {removed} removed. The other {kept} variables keep exactly what the template already says, including hand-written notes and placeholder values.\n\nA snapshot is saved first, so you can always restore from Snapshot History.",
  "pd.exampleConfirmAction": "Update",
  "pd.exampleNoChangeToast": ".env.example is already up to date",
  "pd.exampleSummary": "{added} added, {removed} removed, {kept} kept",
  "pd.alreadyMainEnvToast": "This is already the .env file",
  "pd.copyOverwriteConfirmTitle": "Overwrite the existing .env?",
  "pd.copyOverwriteConfirmMessage":
    "This project already has a .env file. Continuing replaces all of it with the contents of {file}.\n\nA snapshot of the current .env is saved first, so you can always get it back from Snapshot History.",
  "pd.copyOverwriteConfirmAction": "Overwrite",
  "pd.copiedAsMainEnvToast": "Copied {file} as .env",
  "pd.envrcTitle": "This project has an .envrc (direnv)",
  "pd.envrcSubtitle": "Left untouched; check your direnv setup",
  "pd.envrcLearnMore": "Learn More",
  "pd.envrcDismiss": "Hide Notice for This Project",
  "pd.envrcDismissedToast": "Notice hidden for this project",
  "pd.envrcDetailMarkdown": `# What is .envrc?

**direnv** is a third-party shell tool (not a feature of Env Keeper). Once installed, it automatically loads the environment variables defined in \`.envrc\` when you \`cd\` into a directory that contains one, and unloads them when you leave.

Some projects put a command like \`dotenv .env.development\` in \`.envrc\` so direnv pipes a specific .env file's content straight into your terminal; other projects just \`export\` a few variables with no relation to any .env file at all.

## Why Env Keeper flags this

Env Keeper edits the .env file on disk directly, but the environment variables **actually active in your terminal** are decided by direnv — the two can drift out of sync: after saving changes via Env Keeper, you usually still need to run \`direnv reload\` (or \`cd\` back in) in your terminal for the new content to actually take effect.

## What Env Keeper does about it

It will **never** read, parse, or modify your \`.envrc\` file — that logic stays entirely under your and direnv's control. This notice only exists so you're not surprised that editing .env here doesn't automatically sync to your shell.

---

Don't want to see this again? Use "Don't Show Again for This Project" below — it only affects the current project.`,
  "pd.searchPlaceholder": "Search variables in {file}...",
  "pd.switchEnvFileTooltip": "Switch Env File",
  "pd.createEnvFileItem": "➕ Create New Env File...",
  "pd.sectionEnvrc": "Environment Notice",
  "pd.sectionEnabled": "Enabled Variables",
  "pd.sectionDisabled": "Disabled Variables (Commented Out)",
  "pd.sectionVariableActions": "Variable Actions",
  "pd.sectionEnvAndSnapshot": "Environment & Snapshots",
  "pd.countItems": "{count} item(s)",
  "pd.actionHide": "Hide Plain Value",
  "pd.actionReveal": "Show Plain Value",
  "pd.actionCopyValue": "Copy Value",
  "pd.actionCopyKey": "Copy Key",
  "pd.actionCopyPair": "Copy Line (KEY=VALUE)",
  "pd.actionEdit": "Edit Variable",
  "pd.actionNew": "New Variable",
  "pd.actionEditRaw": "Edit Whole File",
  "pd.editRawNavTitle": "Edit {file}",
  "pd.editRawHint":
    "Plain text, same syntax as .env. A snapshot is taken before saving, and external changes are still detected",
  "pd.actionToggleOff": "Disable Variable",
  "pd.actionToggleOn": "Enable Variable",
  "pd.actionSecretOff": "Unmark as Sensitive",
  "pd.actionSecretOn": "Mark as Sensitive",
  "pd.actionDelete": "Delete Variable",
  "pd.actionSnapshotHistory": "View Snapshot History",
  "pd.actionGenerateExample": "Generate/Update .env.example",
  "pd.actionCopyAsMainEnv": "Copy This Environment to .env",
  "pd.lockTooltip": "Sensitive field (masked)",
  "pd.disabledTag": "Commented Out",
  "pd.encryptedTag": "Encrypted",
  "pd.duplicateTag": "Duplicate",
  "pd.overwriteConfirmTitle": "{file} already has {key}",
  "pd.overwriteConfirmMessage":
    "Saving will replace its current value (the old content goes into a snapshot). Overwrite?",
  "pd.overwriteConfirmAction": "Overwrite",
  "pd.overwriteCancelled": "Not saved; the existing value is unchanged",
  "pd.exportTooltip": "This line has an export prefix. dotenv accepts it, and it also works when sourced into a shell",
  "pd.duplicateTooltip":
    "{key} appears on {count} lines. Most loaders only honor one of them (dotenv keeps the first, some keep the last). Keep a single line",
  "pd.deleteConfirmTitle": "Delete Variable: {key}",
  "pd.deleteConfirmMessage":
    "Are you sure you want to remove {key} from {file}? A backup snapshot will be created automatically before the change.",
  "pd.emptyTitle": "No Variables in This Environment",
  "pd.emptyDesc": "File path: {path}\nPress ⌘N to create your first variable",
  "pd.fillStructureMenuTitle": "Copy Structure From…",
  "pd.fillFullMenuTitle": "Copy Content From…",
  "pd.fillStructureSuccessToast": "Copied structure of {file} (no values)",
  "pd.fillFullSuccessToast": "Copied content from {file} (real values included)",
  "pd.fillFailedTitle": "Could Not Fill In Content",

  "raw.contentTitle": "Content",
  "raw.notSavedTitle": "Not Saved",
  "raw.notSavedMessage": "Reloaded from disk; your edits are still in the editor",

  "ps.sectionTitle": "Profiles",
  "ps.applyMenuTitle": "Apply Profile",
  "ps.saveAsNew": "Save as New Profile",
  "ps.sectionCreate": "Create",
  "ps.nameDuplicateError": "A profile with that name already exists",
  "ps.createBlank": "New Blank Profile",
  "ps.blankContentPlaceholder": "KEY=value\n# one per line, same syntax as .env",
  "ps.actionDuplicate": "Duplicate",
  "ps.duplicateName": "{name} copy",
  "ps.manage": "Manage Profiles",
  "ps.liveTag": "● Active",
  "grp.ungrouped": "Ungrouped",
  "grp.section": "Group · {group}",
  "ps.groupSectionCount": "{count} profiles",
  "ps.groupFilterTooltip": "Filter by group",
  "ps.groupFilterAll": "All groups",
  "ps.appliedToast": "Applied “{name}” to {file}",
  "ps.applyFailedTitle": "Apply Failed",
  "ps.loadFailedTitle": "Failed to Load Presets",
  "ps.savedToast": "Saved as “{name}”",
  "ps.updatedToast": "Updated “{name}”",
  "ps.deleteConfirmTitle": "Delete profile “{name}”?",
  "ps.deleteConfirmMessage":
    "Only this profile is deleted; no project file is touched. You can recover it from the profile history.",
  "ps.deletedToast": "Deleted “{name}”",
  "ps.formNavCreate": "Save as New Profile",
  "ps.formNavEdit": "Edit Profile",
  "ps.nameTitle": "Name",
  "ps.namePlaceholder": "Anything, e.g. client-acme",
  "ps.nameEmptyError": "Name cannot be empty",
  "ps.noteTitle": "Note",
  "ps.notePlaceholder": "Optional. What is this profile for?",
  "grp.existingTitle": "Existing Group",
  "grp.none": "(No group)",
  "grp.newTitle": "Or Create a New Group",
  "grp.newPlaceholder": "If filled, this overrides the selection above",
  "ps.contentPreviewTitle": "Content",
  "ps.contentPreviewHint": "From “{file}”, secrets masked. Content is editable later under Manage Profiles",
  "ps.contentPreviewEmpty": "(empty)",
  "ps.submitCreate": "Save Profile",
  "ps.submitEdit": "Save Changes",
  "ps.contentNavTitle": "Edit Content of “{name}”",
  "ps.contentTitle": "Content",
  "ps.contentHint":
    "Same syntax as a .env file, one KEY=VALUE per line. Shown in plain text, so close this once you're done.",
  "ps.navTitle": "Profiles · {project}",
  "ps.searchPlaceholder": "Search profiles by name, note or group...",
  "ps.emptyTitle": "No Profiles Yet",
  "ps.emptyDesc": "Go back to the env file and use “Save as New Profile” to keep its current content",
  "ps.varCount": "{count} variables",
  "ps.liveAccessory": "Active · {file}",
  "ps.actionApply": "Apply to {file}",
  "ps.actionEditContent": "Edit Content",
  "ps.actionEditMeta": "Rename / Note / Group",
  "grp.actionRename": "Rename Group “{group}”",
  "grp.actionDissolve": "Dissolve Group “{group}”",
  "grp.renameNav": "Rename Group “{group}”",
  "grp.renameNameTitle": "New Group Name",
  "grp.renameHint": "All {count} items in group “{group}” will move over",
  "grp.renameSubmit": "Rename",
  "grp.mergeTitle": "Merge into existing group “{to}”?",
  "grp.mergeMessage": "The {count} items in “{from}” will join “{to}”; “{from}” will no longer exist.",
  "grp.mergeConfirm": "Merge",
  "grp.renamedToast": "Renamed group “{from}” to “{to}”",
  "grp.dissolveTitle": "Dissolve group “{group}”?",
  "grp.dissolveMessage": "All {count} items are kept; they just no longer belong to any group.",
  "grp.dissolveConfirm": "Dissolve",
  "grp.dissolvedToast": "Dissolved group “{group}”",
  "ps.actionHistory": "View Profile History",
  "ps.actionCopy": "Copy Content",
  "ps.actionDelete": "Delete Profile",
  "ps.diffNavApply": "What applying “{name}” would change",
  "ps.diffNavDrift": "What changed since applying “{name}”",
  "ps.diffApplyHeading": "{file} → Profile “{name}”",
  "ps.diffApplyHint": "What happens to {file} after applying this profile",
  "ps.diffDriftHeading": "Profile “{name}” → {file}",
  "ps.diffDriftHint": "What changed in {file} since it was applied",
  "ps.diffContentHeading": "Profile Content",
  "ps.actionReveal": "Show Plain Values",
  "ps.actionHide": "Hide Plain Values",
  "ps.driftTitle": "{file} changed after applying “{name}”",
  "ps.driftSubtitle": "The two no longer match",
  "ps.driftViewDiff": "View Differences",
  "ps.driftUpdatePreset": "Save Changes to “{name}”",
  "ps.driftUpdateConfirmTitle": "Overwrite profile “{name}” with the current content of {file}?",
  "ps.driftUpdateConfirmMessage": "The previous content goes into the profile history and can be recovered.",
  "ps.driftUpdateConfirmAction": "Update Profile",
  "ps.driftDismiss": "Dismiss",
  "ps.driftDismissedToast": "Hidden until the next profile is applied",

  "psh.navTitle": "Profile History · {project}",
  "psh.sectionTitle": "History",
  "psh.sectionSubtitle": "{count} records",
  "psh.searchPlaceholder": "Search by time...",
  "psh.actionRestore": "Restore This Version",
  "psh.restoreConfirmTitle": "Restore profiles from {time}?",
  "psh.restoreConfirmMessage":
    "All profiles of “{project}” go back to that version; other projects are untouched. The current state is recorded first, so this can be undone.",
  "psh.restoreConfirmAction": "Restore",
  "psh.restoredToast": "Profiles restored",
  "psh.restoreFailedTitle": "Restore Failed",
  "psh.loadFailedTitle": "Failed to Load Preset History",
  "psh.unreadable": "This record cannot be read",
  "psh.emptyTitle": "No History Yet",
  "psh.emptyDesc": "A record is kept automatically before every change to this project's profiles",
  "psh.infoHeading": "Record Info",
  "psh.infoRecordedAt": "Recorded At",
  "psh.infoCount": "Profiles",
  "psh.contentHeading": "This Project's Profiles at That Time",
  "psh.contentEmpty": "(none at that time)",
  "psh.actionCopy": "Copy This Version",
  "psh.actionDelete": "Delete This Record",
  "psh.deleteConfirmTitle": "Delete this history record?",
  "psh.deleteConfirmMessage": "Delete {filename}. This cannot be undone.",
  "psh.deletedToast": "Deleted",
  "psh.actionCleanup": "Clean Up Old Records",
  "psh.cleanupUnit": "records",
  "psh.cleanupDescription":
    "Only removes what “{project}” recorded in these versions. Other projects keep every restore point, and profiles themselves are untouched.",
  "psh.focusNavTitle": "History of “{name}”",
  "psh.focusActionRestore": "Restore This Profile",
  "psh.focusRestoreConfirmTitle": "Restore “{name}” to how it was at {time}?",
  "psh.focusRestoreConfirmMessage":
    "Only this profile (name, note, group, content) is restored; others are untouched. The current state is recorded first, so this can be undone.",
  "psh.focusAbsent": "This profile did not exist in this version",
  "psh.focusRenamed": "Renamed: {from} → {to}",
  "psh.focusRegrouped": "Group: {from} → {to}",
  "psh.focusNoteChanged": "Note changed",
  "psh.focusEmptyTitle": "No Changes Recorded for This Profile",
  "psh.focusEmptyDesc": "A record is kept automatically before every change to it",
  "ps.actionFocusHistory": "View This Profile's History",

  "ev.keyEmptyError": "Variable name cannot be empty",
  "ev.keyInvalidError": "Only letters, digits, _ . and - are allowed",
  "ev.keyTitle": "Key",
  "ev.keyPlaceholder": "e.g. DATABASE_URL, PORT",
  "ev.valueTitle": "Value",
  "ev.valuePlaceholder": "Variable value...",
  "ev.commentTitle": "Inline Comment",
  "ev.commentPlaceholder": "e.g. used for local development",
  "ev.commentInfo":
    "A note kept at the end of this line, saved as KEY=value # note. It is preserved when generating .env.example. Leave empty for no comment.",
  "ev.quoteTitle": "Wrap with Quotes",
  "ev.quoteNone": "None (recommended for plain values)",
  "ev.quoteDouble": 'Double quotes "..."',
  "ev.quoteSingle": "Single quotes '...'",
  "ev.quoteBacktick": "Backticks `...`",
  "ev.disabledLabel": "Disabled (commented out in .env)",
  "ev.secretLabel": "Mark as sensitive (masked in the list)",
  "ev.encryptedWarning":
    "⚠️ This value is encrypted by dotenvx (encrypted: prefix). Editing it here will break the encrypted data — normally you should re-encrypt via the dotenvx CLI instead of editing the plaintext.",
  "ev.encryptedOverrideLabel": "Overwrite the encrypted value with plain text",
  "ev.encryptedBlockedError": "Check the box above to overwrite this encrypted value",
  "ev.submitEdit": "Save Changes",
  "ev.submitCreate": "Create Variable",

  "cf.description": "Creates a new, empty env file in the project folder and switches to it automatically.",
  "cf.suffixTitle": "Environment Name",
  "cf.suffixPlaceholder": "e.g. development, staging, development.local",
  "cf.suffixEmptyError": "Please enter an environment name",
  "cf.suffixInvalidError": "Only letters, digits, _ and -; dots split segments",
  "cf.templateNameError":
    '{filename} is a template file and is not managed as an env file. Use "Generate/Update .env.example" instead',
  "cf.previewFilename": "Will create {filename}",
  "cf.alreadyExistsError": "{filename} already exists",
  "cf.nameTakenByNonFile": "{filename} is a folder, not a file",
  "cf.submitTitle": "Create Env File",
  "cf.successToast": "Created {filename}",
  "cf.failToast": "Failed to Create Env File",

  "st.searchPlaceholder": "Search name, group, or kind (export/alias)...",
  "st.loadFailedTitle": "Failed to Load Shell Config",
  "st.toggledToast": "Snippet state updated; takes effect in new terminals",
  "st.addedToast": "Snippet added; takes effect in new terminals",
  "st.updatedToast": "Snippet updated; takes effect in new terminals",
  "st.deletedToast": "Snippet deleted; takes effect in new terminals",
  "st.movedToast": "Moved to {index} of {total}; applies to new terminals",
  "st.actionMoveUp": "Move Up (Earlier in shell.sh)",
  "st.actionMoveDown": "Move Down (Later in shell.sh)",
  "st.actionPreviewScript": "View Generated shell.sh",
  "st.previewTitle": "Generated shell.sh",
  "st.previewIntro":
    "This is the file Env Keeper actually generates from your enabled snippets. **The list groups snippets by type, but this is the real execution order** — the shell runs top to bottom, so later snippets can use what earlier ones define.",
  "st.previewPathLabel": "File path",
  "st.previewStale":
    "⚠️ The file on disk doesn't match this preview — the last save may have failed, or the file was edited by hand",
  "st.syntaxErrorHint": "{shell} syntax error in the generated script; nothing written",
  "st.previewCopy": "Copy Whole File",
  "st.orderTooltip": "Position in the generated shell.sh",
  "st.actionConfigHistory": "View Shell Config History",
  "st.actionSnippetHistory": "View This Snippet's History",
  "st.actionRcBackups": "View Backups of {file}",
  "st.rcBackupNote": "The previous content was backed up to {path}",
  "st.actionRevealSecrets": "Show Plain Values",
  "st.actionHideSecrets": "Hide Plain Values",
  "st.secretTag": "Sensitive",
  "st.actionEnableGroup": "Enable Group “{group}”",
  "st.actionDisableGroup": "Disable Group “{group}”",
  "st.groupEnabledToast": "Group “{group}” enabled; applies to new terminals",
  "st.groupDisabledToast": "Group “{group}” disabled; applies to new terminals",
  "st.groupRenamedToast": "Renamed “{from}” to “{to}”; shell.sh regenerated",
  "st.groupDissolvedToast": "Dissolved group “{group}” and regenerated shell.sh",
  "st.detailGroup": "Group",
  "st.conflictVariable": "Variable {name}",
  "st.conflictAlias": "alias {name}",
  "st.conflictLine": "{what} is also set in “{others}”; “{effective}” wins (later in shell.sh)",
  "st.conflictLineOnly": "{what} is also set in “{others}”; this snippet wins (later in shell.sh)",
  "st.detailConflicts": "Duplicate Settings",
  "st.conflictToast": "{what} is also set in “{others}”; “{effective}” wins",
  "es.containsSecretLabel": "Contains secrets (masked by default)",
  "sch.searchPlaceholder": "Search Shell config history...",
  "sch.navTitle": "Shell Config History",
  "sch.sectionTitle": "Shell Config History",
  "sch.sectionSubtitle": "{count} entries",
  "sch.emptyTitle": "No history yet",
  "sch.emptyDesc": "Before every change to your Shell snippets, Env Keeper saves the previous config here",
  "sch.infoHeading": "This entry",
  "sch.infoRecordedAt": "Recorded at",
  "sch.infoFileSize": "Size",
  "sch.infoSnippetCount": "Snippets",
  "sch.contentHeading": "Snippets in this entry",
  "sch.contentEmpty": "This entry has no snippets",
  "sch.unreadable": "Could not read this entry — the file may be damaged",
  "sch.actionRestore": "Restore This Config",
  "sch.actionDelete": "Delete This Entry",
  "sch.restoreConfirmTitle": "Restore the config from {time}?",
  "sch.restoreConfirmMessage":
    "Your current Shell config will be replaced entirely, and shell.sh will be regenerated.\n\nThe current config is saved first, so you can always switch back.",
  "sch.restoreConfirmAction": "Restore",
  "sch.restoredToast": "Restored; applies to new terminals",
  "sch.restoreFailedTitle": "Restore Failed",
  "sch.loadFailedTitle": "Failed to Load Config History",
  "sch.deleteConfirmTitle": "Delete this history entry?",
  "sch.deleteConfirmMessage": "Only the entry {filename} is deleted; your current Shell config is untouched.",
  "sch.deletedToast": "History entry deleted",
  "sch.actionCopy": "Copy This Config",
  "sch.actionCleanup": "Clean Up Old Entries",
  "sch.cleanupUnit": "history entries",
  "sch.cleanupDescription":
    "Only Shell config history entries are deleted. Your current Shell config and the project snapshots are untouched.",
  "sch.focusNavTitle": "History of {name}",
  "sch.focusSectionTitle": "History: {name}",
  "sch.focusEmptyTitle": "No changes recorded for this snippet yet",
  "sch.focusEmptyDesc": "From the next edit on, every change to this snippet shows up here",
  "sch.focusAbsent": "This snippet did not exist in this version yet",
  "sch.focusUnchanged": "This snippet did not change",
  "sch.focusActionRestore": "Restore Whole Config",
  "sch.focusRestoreOnlyThis":
    "This restores the whole Shell config, not just “{name}”. In this version every other snippet matches what you have now, so only “{name}” changes. Open a new terminal window for it to take effect.",
  "sch.focusRestoreAlsoAffects":
    "This restores the whole Shell config, not just “{name}”. These {count} snippets go back to this version too: {others}. Open a new terminal window for it to take effect.",
  "st.detailOrder": "Position",
  "st.detailOrderValue": "{index} of {total}",
  "st.bootstrapSection": "Shell Integration",
  "st.sectionSnippets": "Snippets",
  "st.bootstrapReadyTitle": "✅ Shell Integration Enabled",
  "st.bootstrapReadySubtitle": "Line found in {file}; changes apply to new terminals",
  "st.bootstrapPendingTitle": "Shell integration is off",
  "st.bootstrapUnknownTitle": "Only zsh and bash are supported",
  "st.bootstrapLearnMore": "Learn More",
  "st.copySourceCommand": "Copy This Line",
  "st.actionCopyRefresh": "Copy Refresh Command",
  "st.refreshCopiedTitle": "Refresh command copied",
  "st.refreshCopiedMessage": "Paste into an open terminal; removals need a new one",
  "st.noSnippetsHint": "No snippets yet — press ⌘N to add one",
  "st.sectionHistoryPreview": "History & Preview",
  "st.sectionCopy": "Copy",
  "st.unsupportedShellSubtitle": "Login shell is {shell}; the script won't run there",
  "st.unsupportedShellDetail": `# Global Shell currently supports zsh and bash only

Your login shell was detected as \`{shell}\`.

The \`shell.sh\` Env Keeper generates uses zsh / bash syntax (\`export A=B\`, \`alias x=y\`) and cannot be loaded by other shells, so "Enable Shell Integration" and rc-file backups are not offered here.

You can still manage and preview snippets; if you also use zsh or bash, source the generated file from that shell's config by hand.`,
  "st.actionEnableIntegration": "Enable Shell Integration",
  "st.enableConfirmTitle": "Enable Shell integration?",
  "st.enableConfirmMessage":
    "Env Keeper will append this line to the end of {file}:\n\n{sourceLine}\n\nIt won't touch anything you already have there, and you can always use “Disable Shell Integration” to remove it. Write it now?",
  "st.enableConfirmAction": "Write",
  "st.enabledIntegrationToast": "Shell integration enabled; applies to new terminals",
  "st.enableFailedTitle": "Enable Failed",
  "st.actionDisableIntegration": "Disable Shell Integration",
  "st.disableConfirmTitle": "Disable Shell integration?",
  "st.disableConfirmMessage":
    "This removes the source line Env Keeper wrote to {file} (only that line; nothing else is touched). New terminal windows will stop loading the variables/aliases/snippets from your Global Shell (already-open windows are unaffected). Remove it?",
  "st.disableConfirmAction": "Remove",
  "st.disabledIntegrationToast": "Shell integration disabled; removed from {file}",
  "st.disableNotFoundTitle": "No Env Keeper line found in {file}",
  "st.disableNotFoundMessage": "Removed by hand, or integration was never enabled",
  "st.disableCustomLineTitle": "Line in {file} isn't in Env Keeper's format",
  "st.disableCustomLineMessage": "Edited or wrapped in an if block; remove it by hand",
  "st.disableFailedTitle": "Disable Failed",
  "st.bootstrapDetailMarkdown": `# Why is this step needed?

Env Keeper compiles the global environment variables, aliases, and snippets you've added (and enabled) in the Global Shell into one file:

\`\`\`
{sourceLine}
\`\`\`

But this file doesn't take effect on its own — zsh/bash only read your config file (e.g. \`~/.zshrc\`) when a terminal starts; they won't look for the file Env Keeper generates on their own. So one line needs to be added to the end of your config file telling your shell to "also read this file on startup".

## How to enable it

Same logic as enabling/disabling a snippet — either works:

- **Enable Shell Integration** (recommended): Env Keeper appends the line for you, without touching anything else already in **{file}**.
- **Copy This Line**: copy it and paste it into **{file}** yourself if you'd rather do it by hand.

## Changed your mind?

Once enabled, this notice switches to "✅ Shell Integration Enabled" and a **Disable Shell Integration** action appears — it cleanly removes the line Env Keeper added from {file}, without touching anything else, and you can re-enable it anytime.

## After enabling it

Open a new terminal window and your snippets will take effect. From then on, whenever you add/edit/remove snippets in the Global Shell, Env Keeper regenerates this file automatically — no need to repeat this step.

## When do changes take effect?

- **New terminals**: automatically, nothing to do.
- **Terminals already open**: they read the config once at startup and never re-read it. Run this line inside them to pick up **added and edited** variables and aliases (there is a "Copy Refresh Command" action):

\`\`\`
{refreshCommand}
\`\`\`

- **Disabled or deleted snippets** cannot be undone this way — the variables and aliases are already in that shell, and re-reading the file will not remove them. Open a new terminal, or \`unset NAME\` / \`unalias NAME\` by hand.

## How do I know if it's enabled?

Every time you open this view, Env Keeper checks whether {file} already contains this line — once it does, this notice automatically switches to "✅ Shell Integration Enabled" and won't nag you again.`,
  "st.actionNewSnippet": "New Shell Snippet",
  "st.actionDisable": "Disable Snippet",
  "st.actionEnable": "Enable Snippet",
  "st.actionEdit": "Edit Snippet",
  "st.actionNew": "New Snippet",
  "st.actionCopyContent": "Copy Snippet Code",
  "st.actionDelete": "Delete Snippet",
  "st.deleteConfirmTitle": "Delete snippet “{name}”?",
  "st.deleteConfirmMessage": "Are you sure you want to delete this snippet?",
  "st.enabledTag": "Active",
  "st.enabledInactiveTag": "Enabled, waiting for integration",
  "st.disabledTag": "Disabled",
  "st.detailType": "Type",
  "st.detailStatus": "Status",
  "st.detailDescription": "Description",
  "st.detailNone": "(none)",

  "es.nameEmptyError": "Snippet name cannot be empty",
  "es.contentEmptyError": "Snippet content cannot be empty",
  "es.syntaxFailedTitle": "Shell Syntax Check Failed ({shell} -n)",
  "es.lintConfirmTitle": "These lines may be mistyped",
  "es.lintMisspelled": "Line {line}: did you mean {suggestion} instead of {word}?",
  "es.lintUnknownPrefix":
    "Line {line}: {word} does not look like a command — the variable on this line will not take effect",
  "es.lintFixAction": "Go Back and Fix",
  "es.lintIgnoreAction": "Save Anyway",
  "es.nameTitle": "Snippet Name",
  "es.namePlaceholder": "e.g. JAVA_HOME or git-status-alias",
  "es.typeTitle": "Snippet Type",
  "es.typeExport": "Environment Variable (export)",
  "es.typeAlias": "Command Alias (alias)",
  "es.typeSnippet": "Snippet (any shell code)",
  "es.contentTitle": "Shell Code",
  "es.exportMismatchHint":
    "⚠️ This doesn't start with export. If it's not setting an environment variable, consider switching to the \"Snippet\" type — just a hint, it won't block saving.",
  "es.aliasMismatchHint":
    "⚠️ This doesn't start with alias. If it's not defining a command alias, consider switching to the \"Snippet\" type — just a hint, it won't block saving.",
  "es.descTitle": "Description (optional)",
  "es.descPlaceholder": "Briefly describe what this snippet does",
  "es.enabledLabel": "Enabled (included in shell.sh)",
  "es.submitTitle": "Save Snippet",
  "es.navCreate": "New Snippet",
  "es.navEdit": "Edit “{name}”",

  "sh.searchPlaceholder": "Search snapshot history...",
  "sh.sectionTitle": "Snapshot History - {file}",
  "sh.sectionSubtitle": "{count} snapshot(s)",
  "sh.actionRestore": "Restore This Version",
  "sh.actionCopyContent": "Copy Snapshot Content",
  "sh.actionDelete": "Delete This Snapshot",
  "sh.actionCleanup": "Clean Up Old Snapshots",
  "sh.cleanupNavTitle": "Clean Up Old Snapshots",
  "sh.cleanupDescription": "Only snapshots of {file} are affected — other env files and {file} itself are untouched.",
  "sh.cleanupKeepTitle": "How Many to Keep",
  "sh.cleanupKeepPlaceholder": "Choose how many to keep",
  "sh.cleanupKeepOption": "Keep the {count} most recent",
  "sh.cleanupKeepNone": "Delete all of them",
  "sh.cleanupPreview": "{total} in total — this deletes {count} of them",
  "sh.cleanupNothing": "{total} in total; nothing matches this setting",
  "sh.cleanupSubmit": "Delete",
  "sh.cleanupConfirmTitle": "Delete {count} {unit}?",
  "sh.cleanupUnit": "snapshots",
  "sh.cleanupConfirmMessage": "There is no way to get them back. The remaining {kept} are untouched.",
  "sh.cleanupDoneToast": "Deleted {count} {unit}",
  "sh.cleanupFailedTitle": "Cleanup stopped because of an error",
  "sh.restoreConfirmTitle": "Restore Snapshot: {timestamp}",
  "sh.restoreConfirmMessage":
    "Are you sure you want to restore {file} to this historical version? The current file will be backed up automatically before restoring, so nothing is ever lost.",
  "sh.restoreConfirmAction": "Restore Now",
  "sh.restoredToast": "Snapshot restored successfully",
  "sh.restoreFailedTitle": "Restore Failed",
  "sh.loadFailedTitle": "Failed to Load Snapshots",
  "sh.restoreErrorTitle": "Restore Error",
  "sh.deleteConfirmTitle": "Delete Snapshot",
  "sh.deleteConfirmMessage": "Are you sure you want to permanently delete snapshot {filename}?",
  "sh.deletedToast": "Snapshot deleted",
  "sh.unreadableContent": "(Unable to read snapshot content)",
  "sh.emptyTitle": "No Snapshots Yet",
  "sh.emptyDesc": "Snapshots appear here automatically once you edit and save environment variables in Env Keeper.",
  "sh.infoHeading": "Snapshot Info",
  "sh.infoTargetFile": "Target File",
  "sh.infoRecordedAt": "Recorded At",
  "sh.infoFileSize": "File Size",
  "sh.contentHeading": "Snapshot Content",
  "sh.contentEmpty": "(empty file)",

  "jt.placeholder": "Project, env file, profile or snippet name...",
  "jt.sectionProjects": "Projects",
  "jt.sectionEnvFiles": "Env Files",
  "jt.sectionPresets": "Profiles",
  "jt.sectionSnippets": "Shell Snippets",
  "jt.actionOpenProject": "Open Project",
  "jt.actionOpenFile": "Open This File",
  "jt.actionOpenPreset": "Open in Manage Profiles",
  "jt.actionOpenSnippet": "Open in Global Shell",
  "jt.actionShowInFinder": "Show in Finder",
  "jt.actionCopyPresetContent": "Copy Profile Content",
  "jt.presetSubtitle": "{project} · {group}",
  "jt.snippetSubtitle": "{group} · {type}",
  "jt.typeExport": "variable",
  "jt.typeAlias": "alias",
  "jt.typeSnippet": "snippet",
  "jt.emptyTitle": "Nothing Matches",
  "jt.emptyDesc":
    "This finds projects, env files, profiles and shell snippets by name; use Search Env Vars for variables",
  "jt.loadFailedTitle": "Failed to Load",
  "jt.problemHint": "Open Global Shell to see how to fix it",
  "search.placeholder": "Search names, values, projects or groups...",
  "search.loadFailedTitle": "Failed to Load Variables",
  "search.sectionTitle": "In Env Files",
  "search.sectionShell": "Global Shell",
  "search.shellSource": "Global Shell / {name}",
  "search.shellSourceGrouped": "Global Shell / {group} / {name}",
  "search.sectionPresets": "In Profiles",
  "search.presetSource": "{project} / Profile “{name}”",
  "search.overriddenTag": "Overridden by “{name}”",
  "search.overriddenTooltip": "Two enabled snippets set it; “{name}” comes later, so it wins",
  "search.actionGotoShell": "Open in Global Shell",
  "search.sectionSubtitle": "{count} variables",
  "search.actionGoto": "Go to Project Details",
  "search.actionHide": "Hide Plain Value",
  "search.actionReveal": "Show Plain Value",
  "search.actionCopyValue": "Copy Value",
  "search.actionCopyKey": "Copy Key",
  "search.lockTooltip": "Sensitive field",
  "search.emptyTitle": "No Matching Variables",
  "search.emptyDesc": "Try another keyword. To find a project, env file, profile or snippet itself, use Jump to",

  // ---- Diff sections (shared by .env snapshots and Shell config history) ----
  "diff.fromPrevHeading": "Previous version → this one",
  "diff.fromPrevHint": "what this save actually changed",
  "diff.toCurrentHeading": "This version → current",
  "diff.toCurrentHint": "what happened between this entry and now",
  "diff.noPrev": "This is the earliest entry — there is nothing older to compare with",
  "diff.none": "No differences at all",
  "diff.added": "🟢 Added",
  "diff.removed": "🔴 Removed",
  "diff.changed": "🟡 Changed",
  "diff.originalValue": "was",
  "diff.addedDisabled": "(added already commented out)",
  "diff.turnedOff": "commented out, no longer in effect",
  "diff.turnedOn": "uncommented, in effect again",
  "diff.commentChanged": "comment {from} → {to}",
  "diff.renamed": "(previously {name})",

  // ---- .zshrc backups ----
  "rcb.navTitle": "Backups of {file}",
  "rcb.searchPlaceholder": "Search backups...",
  "rcb.sectionTitle": "Backup Files",
  "rcb.sectionSubtitle": "{count} backups",
  "rcb.emptyTitle": "No backups yet",
  "rcb.emptyDesc":
    "A copy of {file} is saved automatically whenever you enable or disable Shell integration — or make one now",
  "rcb.infoHeading": "This backup",
  "rcb.infoOrigin": "Original file",
  "rcb.infoRecordedAt": "Backed up at",
  "rcb.infoFileSize": "Size",
  "rcb.contentHeading": "Backup content",
  "rcb.contentEmpty": "(empty file)",
  "rcb.unreadable": "This backup cannot be read — the file may be damaged",
  "rcb.actionBackupNow": "Back Up {file} Now",
  "rcb.sectionBackup": "Make Another Backup",
  "rcb.actionBackupTo": "Back Up to Another Location",
  "rcb.actionRestore": "Restore This Backup",
  "rcb.actionShowInFinder": "Show This Backup in Finder",
  "rcb.actionDelete": "Delete This Backup",
  "rcb.backupToNavTitle": "Back Up to Another Location",
  "rcb.backupToDescription":
    "Copies {file} as-is. If you don't pick a folder, it goes to Env Keeper's own backup folder: {dir}",
  "rcb.backupToDirTitle": "Save to",
  "rcb.backupToDirInfo": "Leave empty to use the default backup folder",
  "rcb.backupSubmit": "Back Up",
  "rcb.backedUpToast": "Backed up",
  "rcb.backupFailedTitle": "Backup Failed",
  "rcb.loadFailedTitle": "Failed to Load Backups",
  "rcb.restoreConfirmTitle": "Overwrite with the backup from {time}?",
  "rcb.restoreConfirmMessage":
    "{file} will be replaced entirely by this backup. The current content is saved as another backup first, so this step is reversible too. Open a new terminal window for it to take effect.",
  "rcb.restoreConfirmAction": "Overwrite",
  "rcb.restoredToast": "{file} restored; applies to new terminals",
  "rcb.restoredSafetyNote": "The previous content was saved to {path}",
  "rcb.restoreFailedTitle": "Restore Failed",
  "rcb.deleteConfirmTitle": "Delete this backup?",
  "rcb.deleteConfirmMessage": "This cannot be undone: {filename}",
  "rcb.deletedToast": "Backup deleted",
} as const;

export type DictKey = keyof typeof en;

/** 字典导出只给测试用(宽度校验);业务代码一律走 t() */
export const dictionary: Record<DictKey, string> = en;

/**
 * 取词函数。vars 里的 {key} 占位符会被替换成对应的值。
 */
export function t(key: DictKey, vars?: Record<string, string | number>): string {
  let str: string = en[key] ?? key;
  if (vars) {
    for (const [k, v] of Object.entries(vars)) {
      str = str.split(`{${k}}`).join(String(v));
    }
  }
  return str;
}

/**
 * 快照份数超过软上限时的提示语；没超过返回 undefined，调用方可以直接塞进 toast 的 message。
 * 参数只声明结构上需要的三个字段，不 import 存储层的类型，避免界面文案层反过来依赖服务层。
 */
export function snapshotLimitHint(result: {
  snapshotLimitExceeded?: boolean;
  snapshotCount?: number;
  snapshotLimit?: number;
}): string | undefined {
  if (!result.snapshotLimitExceeded) return undefined;
  return t("common.snapshotLimitMessage", {
    count: result.snapshotCount ?? 0,
    limit: result.snapshotLimit ?? 0,
  });
}
