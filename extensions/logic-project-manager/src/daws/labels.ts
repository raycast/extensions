import type { DawLabels } from "./types";

export const labels: DawLabels = {
  sets: "Alternatives",
  // 共用代码取的 current Set 优先是 Active 的那个，Logic 打开项目时打开的也是它。
  currentSet: "Active Alternative",
  viewSets: "View Alternatives",
  openCurrentSet: "Open Active Alternative",
  noSets: "No Alternatives Found",
  openSetFailed: "Couldn't Open Project",
  readingSets: "Reading Alternatives…",
  newProjectFile: "New Project",
  newProjectFileFailed: "Couldn't Create Project",
  dawAppNotFound: "Couldn't Find Logic Pro",
  noProjectsFound: "No Logic Projects Found",
  noProjectsFoundHint: "Nothing in {folder} contains a Logic project. Check the Projects Folder in preferences.",
  // 开着项目改名时 Logic 会怎样还没测过，所以只提醒先关掉，不写后果。
  renameConfirmMessage: "Make sure this project is closed in Logic Pro before renaming it.",
};
