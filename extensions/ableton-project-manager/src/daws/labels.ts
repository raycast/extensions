import type { Language } from "@/settings";
import type { DawLabels } from "./types";

const labels: Record<Language, DawLabels> = {
  en: {
    sets: "Sets",
    latestSet: "Latest Set",
    viewSets: "View Sets",
    openLatestSet: "Open Latest Set",
    noSets: "No Sets Found",
    openSetFailed: "Couldn't Open Set",
    readingSets: "Reading Sets…",
    newProjectFile: "New Live Set",
    newProjectFileFailed: "Ableton Live not found",
    noProjectsFound: "No Ableton projects found",
    noProjectsFoundHint: "Nothing in {folder} contains a Live Set. Check the Projects Folder in preferences.",
    renameConfirmMessage:
      "Make sure this project is closed in Ableton Live. Renaming while it's open can detach your session.",
  },
};

export function getDawLabels(language: Language): DawLabels {
  return labels[language];
}

// 模板列表的文字。只有 Live 有模板功能，所以不放进共用的 DawLabels。
const templateLabels: Record<
  Language,
  {
    newProjectWithTemplate: string;
    createLiveSet: string;
    searchTemplates: string;
    templates: string;
    noTemplates: string;
    noTemplatesHint: string;
    templateNameExists: string;
    templateTrashHint: string;
  }
> = {
  en: {
    newProjectWithTemplate: "New Live Set from Template",
    createLiveSet: "Create Live Set",
    searchTemplates: "Search Templates",
    templates: "Templates",
    noTemplates: "No templates found",
    noTemplatesHint: "Nothing in {folder} looks like a template. Check the Templates Folder in preferences.",
    templateNameExists: "A template with that name already exists",
    templateTrashHint: "This moves the template to the Trash:",
  },
};

export function getTemplateLabels(language: Language) {
  return templateLabels[language];
}
