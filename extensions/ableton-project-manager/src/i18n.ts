import { Language } from "./settings";

type TranslationKeys = {
  searchProjects: string;
  searchSets: string;
  searchBounces: string;
  searchCollections: string;
  searchTracks: string;
  searchStages: string;
  searchGenres: string;
  searchRoles: string;
  searchLeftovers: string;
  viewSets: string;
  openInAbletonLive: string;
  editInfo: string;
  save: string;
  pinProject: string;
  unpinProject: string;
  moveUp: string;
  moveDown: string;
  copyProjectName: string;
  copyProjectPath: string;
  copySetName: string;
  copySetPath: string;
  copyLatestBounce: string;
  copyBounce: string;
  copyBounceName: string;
  copyBouncePath: string;
  bounceCopied: string;
  openInFinder: string;
  showInFinder: string;
  openInDefaultApp: string;
  browseCollections: string;
  backToProjects: string;
  open: string;
  tracklist: string;
  unsorted: string;
  setTrackNumber: string;
  swapUp: string;
  swapDown: string;
  duplicateTrack: string;
  moveToBottom: string;
  moveToTop: string;
  addToTracklist: string;
  removeFromTracklist: string;
  trackNumber: string;
  invalidPosition: string;
  filter: string;
  all: string;
  notes: string;
  openNote: string;
  openLyrics: string;
  showNotes: string;
  showLyrics: string;
  editNote: string;
  none: string;
  pinned: string;
  sortBy: string;
  groupBy: string;
  groupByCreated: string;
  groupByModified: string;
  groupNone: string;
  bandToday: string;
  bandYesterday: string;
  bandPrev7Days: string;
  bandPrev30Days: string;
  modifiedNewest: string;
  modifiedOldest: string;
  createdNewest: string;
  createdOldest: string;
  nameAZ: string;
  nameZA: string;
  infoUpdated: string;
  projectPinned: string;
  projectUnpinned: string;
  tag: string;
  name: string;
  invalidName: string;
  nameExists: string;
  renameFailed: string;
  docRenameSkipped: string;
  docNameHint: string;
  docConflictWarning: string;
  renameAnyway: string;
  collectionNameExists: string;
  tagNameExists: string;
  docChangedExternally: string;
  docChangedExternallyHint: string;
  overwriteDoc: string;
  projectsRestored: string;
  restoreDocConflict: string;
  docFolderMissing: string;
  docFolderMissingHint: string;
  openPreferences: string;
  docSaveFailed: string;
  useProjectFolders: string;
  manyProjectsMissing: string;
  manyProjectsMissingHint: string;
  openProjectsFolder: string;
  ambiguousFinderChanges: string;
  docShared: string;
  docSharedHint: string;
  docNameTaken: string;
  renameConfirmTitle: string;
  renameConfirmMessage: string;
  rename: string;
  edit: string;
  color: string;
  sizeLargest: string;
  sizeSmallest: string;
  browseBounces: string;
  playLatestBounce: string;
  playingLatestBounce: string;
  playbackFailed: string;
  stoppingPlayback: string;
  noBounces: string;
  manageExternalBounce: string;
  externalBounceSaved: string;
  externalBounceFormHint: string;
  externalBounceFoldersField: string;
  externalBounceFilesField: string;
  stage: string;
  genre: string;
  collection: string;
  collections: string;
  deleteCollectionHint: string;
  role: string;
  create: string;
  delete: string;
  created: string;
  renamed: string;
  deleted: string;
  noCategories: string;
  tracklistDuration: string;
  queueCollection: string;
  collectionQueued: string;
  queueFailed: string;
  tracksWord: string;
  skippedNoBounce: string;
  pausePlayback: string;
  resumePlayback: string;
  stopPlayback: string;
  seekBackward: string;
  seekForward: string;
  restartTrack: string;
  showDetail: string;
  showOverview: string;
  newLiveSet: string;
  newLiveSetFailed: string;
  duplicateSet: string;
  duplicateProject: string;
  duplicatingProject: string;
  projectDuplicated: string;
  duplicateFailed: string;
  renameSet: string;
  setRenamed: string;
  setNameExists: string;
  renameSetConfirmTitle: string;
  renameSetConfirmMessage: string;
  setDuplicated: string;
  moveToTrash: string;
  movedToTrash: string;
  trashProjectHint: string;
  trashSetHint: string;
  trashBounceHint: string;
  cleanUpLeftovers: string;
  leftoversFound: string;
  leftoversFoundMessage: string;
  noRemovedProjects: string;
  removedNotOnDisk: string;
  cleanUp: string;
  cleanUpAll: string;
  cleanedUp: string;
  cleanUpRemovedConfirmTitle: string;
  cleanUpRemovedConfirmMessage: string;
  trashNoAccess: string;
  trashNoAccessHint: string;
  openFullDiskAccess: string;
  loadProjectsFailed: string;
  loadProjectsFailedHint: string;
  noNotesYet: string;
  noLyricsYet: string;
  storageUnreadable: string;
  renameDataPending: string;
  docUnreadable: string;
  docUnreadableHint: string;
  trashFailed: string;
  sectionPlayback: string;
  sectionDetails: string;
  sectionFile: string;
  sectionCopy: string;
  sectionPin: string;
  sectionTracklist: string;
  sectionView: string;
  sectionArrange: string;
  sectionNavigate: string;
  sectionDangerZone: string;
  removeFromCollection: string;
  removeFromCollectionHint: string;
  addProjects: string;
  add: string;
  projects: string;
  projectsAdded: string;
  allProjectsInCollection: string;
  resetToDefaults: string;
  resetToDefaultsHint: string;
  noChanges: string;
  removeCollectionsConfirmTitle: string;
  removeCollectionsConfirmHint: string;
  removeCollectionsFormHint: string;
  groupBySource: string;
  sourceProjectFolder: string;
  sourceExternal: string;
  unavailable: string;
  renameBounce: string;
  bounceRenamed: string;
  bounceNameExists: string;
  removeExternalSource: string;
  externalSourceRemoved: string;
  removeExternalSourceConfirmTitle: string;
  removeExternalSourceConfirmHint: string;
  copyError: string;
  saveFailed: string;
  storageUnreadableHint: string;
  ambiguousFinderChangesHint: string;
  renameDataPendingHint: string;
  assignToProjects: string;
  assignFormHint: string;
  assignStageMoveHint: string;
  tagsAssigned: string;
  deleteTagInUse: string;
  deleteRoleInUse: string;
  noProjectsFound: string;
  noProjectsFoundHint: string;
  templateMissing: string;
  analyzing: string;
};

const translations: Record<Language, TranslationKeys> = {
  en: {
    searchProjects: "Search Projects",
    searchSets: "Search Sets",
    searchBounces: "Search Bounces",
    searchCollections: "Search Collections",
    searchTracks: "Search Tracks",
    searchStages: "Search Stages",
    searchGenres: "Search Genres",
    searchRoles: "Search Roles",
    searchLeftovers: "Search Leftovers",
    viewSets: "View Sets",
    openInAbletonLive: "Open in Ableton Live",
    editInfo: "Edit Info",
    save: "Save",
    pinProject: "Pin",
    unpinProject: "Unpin",
    moveUp: "Move Up",
    moveDown: "Move Down",
    copyProjectName: "Copy Project Name",
    copyProjectPath: "Copy Project Path",
    copySetName: "Copy Set Name",
    copySetPath: "Copy Set Path",
    copyLatestBounce: "Copy Latest Bounce",
    copyBounce: "Copy Bounce",
    copyBounceName: "Copy Bounce Name",
    copyBouncePath: "Copy Bounce Path",
    bounceCopied: "Bounce Copied",
    openInFinder: "Open in Finder",
    showInFinder: "Show in Finder",
    openInDefaultApp: "Open in Default App",
    browseCollections: "Browse Collections",
    backToProjects: "Back to Search Projects",
    open: "Open",
    tracklist: "Tracklist",
    unsorted: "Unsorted",
    setTrackNumber: "Set Track Number…",
    swapUp: "Swap Up",
    swapDown: "Swap Down",
    duplicateTrack: "Duplicate track number",
    moveToBottom: "Move to Bottom",
    moveToTop: "Move to Top",
    addToTracklist: "Add to Tracklist",
    removeFromTracklist: "Remove from Tracklist",
    trackNumber: "Track Number",
    invalidPosition: "Enter a valid number",
    filter: "Filter",
    all: "All",
    notes: "Notes",
    openNote: "Open Note",
    openLyrics: "Open Lyrics",
    showNotes: "Show Notes",
    showLyrics: "Show Lyrics",
    editNote: "Edit Note",
    none: "None",
    pinned: "Pinned",
    sortBy: "Sort By",
    groupBy: "Group By",
    groupByCreated: "Created",
    groupByModified: "Modified",
    groupNone: "None",
    bandToday: "Today",
    bandYesterday: "Yesterday",
    bandPrev7Days: "Previous 7 Days",
    bandPrev30Days: "Previous 30 Days",
    modifiedNewest: "Modified — Newest",
    modifiedOldest: "Modified — Oldest",
    createdNewest: "Created — Newest",
    createdOldest: "Created — Oldest",
    nameAZ: "Name — A → Z",
    nameZA: "Name — Z → A",
    infoUpdated: "Info Updated",
    projectPinned: "Project Pinned",
    projectUnpinned: "Project Unpinned",
    tag: "Tag",
    name: "Name",
    invalidName: "Name can't contain / or :",
    nameExists: "A project with that name already exists",
    renameFailed: "Rename failed",
    docRenameSkipped: "Renamed — but a doc wasn't moved",
    docNameHint: "Note & lyrics file: “{file}” ({chars} → full-width look-alikes)",
    docConflictWarning:
      "The notes folder already contains {files}. After renaming, this project will show that existing file; its own notes (if any) keep the old file name.",
    renameAnyway: "Rename Anyway",
    collectionNameExists: "A collection with that name already exists",
    tagNameExists: "A tag with that name already exists",
    docChangedExternally: "Note Changed Elsewhere",
    docChangedExternallyHint:
      "This note was edited outside Raycast (e.g. in Obsidian) after you opened it. Saving will replace those changes.",
    overwriteDoc: "Overwrite",
    projectsRestored: "Restored put-back project",
    restoreDocConflict: "Restored — a note name was taken",
    docFolderMissing: "Notes / lyrics folder not found",
    docFolderMissingHint: "Choose it again in Extension Preferences. Nothing will be written until then.",
    openPreferences: "Open Extension Preferences",
    docSaveFailed: "Couldn't save",
    useProjectFolders: "Store in Project Folders Instead",
    manyProjectsMissing: "Projects missing — nothing changed",
    manyProjectsMissingHint:
      "Most projects disappeared at once. Is the drive connected? If you moved the folder, update it in preferences.",
    openProjectsFolder: "Open Projects Folder",
    ambiguousFinderChanges: "Some Finder changes skipped",
    docShared: "Shares a note file with another project",
    docSharedHint:
      "This project's notes / lyrics file would be the same as {names}'s. Rename this project so each keeps its own file — nothing is read or written until then.",
    docNameTaken: "Note file name already used",
    renameConfirmTitle: "Rename project?",
    renameConfirmMessage:
      "Make sure this project is closed in Ableton Live. Renaming while it's open can detach your session.",
    rename: "Rename",
    edit: "Edit",
    color: "Color",
    sizeLargest: "Size — Largest",
    sizeSmallest: "Size — Smallest",
    browseBounces: "Browse Bounces",
    playLatestBounce: "Play Latest Bounce",
    playingLatestBounce: "Playing Latest Bounce",
    playbackFailed: "Playback Failed",
    stoppingPlayback: "Stopping Playback",
    noBounces: "No Bounces Found",
    manageExternalBounce: "Manage External Bounce",
    externalBounceSaved: "External Bounces Updated",
    externalBounceFormHint:
      "Add folders or files from outside this project to count as its bounces. These are added on top of the Bounces Folder setting, not a replacement. Unreachable sources (e.g. an unplugged drive) are kept and shown as unavailable until you remove them.",
    externalBounceFoldersField: "External Folders",
    externalBounceFilesField: "External Files",
    stage: "Stage",
    genre: "Genre",
    collection: "Collection",
    collections: "Collections",
    deleteCollectionHint: "This only removes the collection. Your projects are not deleted.",
    role: "Role",
    create: "Create",
    delete: "Delete",
    created: "Created",
    renamed: "Renamed",
    deleted: "Deleted",
    noCategories: "Nothing here yet",
    tracklistDuration: "Tracklist Duration",
    queueCollection: "Queue Collection in Player",
    collectionQueued: "Collection Queued",
    queueFailed: "Queue Failed",
    tracksWord: "tracks",
    skippedNoBounce: "skipped (no bounce)",
    pausePlayback: "Pause",
    resumePlayback: "Resume",
    stopPlayback: "Stop Playback",
    seekBackward: "Backward",
    seekForward: "Forward",
    restartTrack: "Restart Track",
    showDetail: "Show Detail",
    showOverview: "Show Overview",
    newLiveSet: "New Live Set",
    newLiveSetFailed: "Ableton Live not found",
    duplicateSet: "Duplicate Set",
    duplicateProject: "Duplicate Project",
    duplicatingProject: "Duplicating Project…",
    projectDuplicated: "Project Duplicated",
    duplicateFailed: "Duplicate Failed",
    renameSet: "Rename Set",
    setRenamed: "Set Renamed",
    setNameExists: "A Set with that name already exists",
    renameSetConfirmTitle: "Rename Set?",
    renameSetConfirmMessage:
      "Make sure this Set is closed in Ableton Live. Renaming while it's open can make Ableton keep saving to the old name.",
    setDuplicated: "Set Duplicated",
    moveToTrash: "Move to Trash",
    movedToTrash: "Moved to Trash",
    trashProjectHint: "This moves the entire project folder to the Trash:",
    trashSetHint: "This moves the Set to the Trash:",
    trashBounceHint: "This moves the bounce to the Trash:",
    cleanUpLeftovers: "Clean up Leftovers",
    leftoversFound: "Found leftover project data",
    leftoversFoundMessage: "{count} to clean up",
    noRemovedProjects: "Nothing to clean up",
    removedNotOnDisk: "Not in Projects folder",
    cleanUp: "Clean Up",
    cleanUpAll: "Clean Up All",
    cleanedUp: "Cleaned Up",
    cleanUpRemovedConfirmTitle: "Clean up this project's data?",
    cleanUpRemovedConfirmMessage:
      "Its notes are archived to the Deleted Projects folder and its tags / track numbers are cleared. The project folder itself is not touched.",
    trashNoAccess: "Projects left the folder — data kept safe",
    trashNoAccessHint: "Grant Full Disk Access to clean up automatically, or run Clean up Leftovers.",
    openFullDiskAccess: "Open Full Disk Access Settings",
    loadProjectsFailed: "Couldn't Load Projects",
    loadProjectsFailedHint: "Check that your Projects folder exists and that Raycast can access it.",
    noNotesYet: "_No notes yet_",
    noLyricsYet: "_No lyrics yet_",
    storageUnreadable: "Saved data unreadable — nothing changed",
    renameDataPending: "Renamed — tags not moved yet",
    docUnreadable: "Couldn't read this note",
    docUnreadableHint:
      "The file exists but couldn't be opened (e.g. not downloaded from iCloud yet). Nothing was changed.",
    trashFailed: "Couldn't move to Trash",
    sectionPlayback: "Playback",
    sectionDetails: "Details",
    sectionFile: "File",
    sectionCopy: "Copy",
    sectionPin: "Pin",
    sectionTracklist: "Tracklist",
    sectionView: "View",
    sectionArrange: "Arrange",
    sectionNavigate: "Navigate",
    sectionDangerZone: "Danger Zone",
    removeFromCollection: "Remove from Collection",
    removeFromCollectionHint:
      "This clears the track's order and role in this collection. The project itself won't be deleted.",
    noChanges: "No Changes",
    addProjects: "Add Projects…",
    add: "Add",
    projects: "Projects",
    projectsAdded: "Projects Added",
    allProjectsInCollection: "All projects are already in this collection.",
    resetToDefaults: "Reset to Defaults",
    resetToDefaultsHint:
      "Custom names, colors, and order will be lost. Projects tagged with an option that no longer exists will have that tag cleared.",
    removeCollectionsConfirmTitle: "Remove from collection?",
    removeCollectionsConfirmHint:
      "This project will be removed from {names}, clearing its order and role there. The project itself won't be deleted.",
    removeCollectionsFormHint: "Removing a collection clears this project's order and role there.",
    groupBySource: "Source",
    sourceProjectFolder: "Project Folder",
    sourceExternal: "External",
    unavailable: "Unavailable",
    renameBounce: "Rename Bounce",
    bounceRenamed: "Bounce Renamed",
    bounceNameExists: "A file with that name already exists",
    removeExternalSource: "Remove External Source",
    externalSourceRemoved: "External Source Removed",
    removeExternalSourceConfirmTitle: "Remove external source?",
    removeExternalSourceConfirmHint:
      "This only removes it from this project's bounces. The file on disk is not deleted.",
    copyError: "Copy Error",
    saveFailed: "Couldn't save",
    storageUnreadableHint:
      "The extension's saved data couldn't be read, so this change was skipped to avoid overwriting it.",
    ambiguousFinderChangesHint: "They couldn't be matched to a project safely, so their tags weren't moved.",
    renameDataPendingHint: "They'll be moved the next time the project list loads.",
    assignToProjects: "Assign to Projects",
    assignFormHint: "Checked projects get this tag. Unchecking a project removes it.",
    assignStageMoveHint: "{count} of the checked projects are in another stage and will move to this one.",
    tagsAssigned: "Tags Updated",
    deleteTagInUse: "{count} project(s) use this. It will be removed from them.",
    deleteRoleInUse: "{count} track(s) in your collections use this role. It will be cleared from them.",
    noProjectsFound: "No Ableton projects found",
    noProjectsFoundHint: "Nothing in {folder} contains a Live Set. Check the Projects Folder in preferences.",
    templateMissing: "Template not found — started empty",
    analyzing: "Analyzing",
  },
};

export function getTranslations(language: Language): TranslationKeys {
  return translations[language];
}
