// Alternatives 视图专用的文字：Logic 的 Alternative 在 .logicx 包里。
type AlternativesViewStrings = {
  searchAlternatives: string;
  openInDaw: string;
  activeAlternative: string;
  copyAlternativeName: string;
  setActive: string;
  activeChanged: string;
  renameAlternative: string;
  alternativeRenamed: string;
  alternativeNameExists: string;
  duplicateAlternative: string;
  alternativeDuplicated: string;
  trashAlternativeHint: string;
  lastAlternative: string;
  changeConfirmTitle: string;
  changeConfirmMessage: string;
  changeFailed: string;
  loadFailed: string;
};

export const alternativesViewStrings: AlternativesViewStrings = {
  searchAlternatives: "Search Alternatives",
  openInDaw: "Open in Logic Pro",
  activeAlternative: "Active Alternative",
  copyAlternativeName: "Copy Alternative Name",
  setActive: "Set as Active Alternative",
  activeChanged: "Active Alternative Changed",
  renameAlternative: "Rename Alternative",
  alternativeRenamed: "Alternative Renamed",
  alternativeNameExists: "An Alternative with that name already exists",
  duplicateAlternative: "Duplicate Alternative",
  alternativeDuplicated: "Alternative Duplicated",
  trashAlternativeHint: "This moves the Alternative to the Trash:",
  lastAlternative: "A project needs at least one Alternative",
  changeConfirmTitle: "Change Alternative?",
  changeConfirmMessage:
    "Make sure this project is closed in Logic Pro. If it's open, Logic will overwrite this change the next time it saves.",
  changeFailed: "Couldn't Change Alternative",
  loadFailed: "Couldn't Load Alternatives",
};

// View Project Files 专用的文字：文件夹形态的项目里有多个 .logicx 时用（多是 Save As 存出来的版本）。
type ProjectFilesViewStrings = {
  viewProjectFiles: string;
  projectFiles: string;
  searchProjectFiles: string;
  openLatestProjectFile: string;
  latestProjectFile: string;
  copyProjectFileName: string;
  renameProjectFile: string;
  duplicateProjectFile: string;
  projectFileRenamed: string;
  projectFileDuplicated: string;
  projectFileNameExists: string;
  trashProjectFileHint: string;
  lastProjectFile: string;
  trashConfirmMessage: string;
  loadFailed: string;
};

export const projectFilesViewStrings: ProjectFilesViewStrings = {
  viewProjectFiles: "View Project Files",
  projectFiles: "Project Files",
  searchProjectFiles: "Search Project Files",
  openLatestProjectFile: "Open Latest Project File",
  latestProjectFile: "Latest Project File",
  copyProjectFileName: "Copy Project File Name",
  renameProjectFile: "Rename Project File",
  duplicateProjectFile: "Duplicate Project File",
  projectFileRenamed: "Project File Renamed",
  projectFileDuplicated: "Project File Duplicated",
  projectFileNameExists: "A project file with this name already exists",
  trashProjectFileHint: "This moves the project file to the Trash:",
  lastProjectFile: "A project needs at least one project file",
  trashConfirmMessage: "Make sure it's closed in Logic Pro. Audio files in the project folder stay where they are.",
  loadFailed: "Couldn't Load Project Files",
};
