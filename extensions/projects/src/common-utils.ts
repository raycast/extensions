import { OpenWith, Preferences, ProjectType, SourceRepo } from "./types";

export function getRepoKey(repo: SourceRepo): string {
  return `${repo.fullPath}/${repo.name}~${repo.type}`;
}

export function isProjectTypeEnabled(projectType: string, preferences: Preferences): boolean {
  if (projectType === ProjectType.NODE) {
    return preferences.openNodeWith !== undefined;
  } else if (projectType === ProjectType.MAVEN) {
    return preferences.openMavenWith !== undefined;
  } else if (projectType === ProjectType.GRADLE) {
    return preferences.openGradleWith !== undefined;
  } else if (projectType === ProjectType.XCODE) {
    return preferences.openXcodeWith !== undefined;
  } else if (projectType === ProjectType.TAURI) {
    return preferences.openTauriWith !== undefined;
  } else if (projectType === ProjectType.WAILS) {
    return preferences.openWailsWith !== undefined;
  }
}

export function getOpenWith(projectType: ProjectType, preferences: Preferences): OpenWith {
  if (projectType === ProjectType.NODE) {
    return preferences.openNodeWith || preferences.openDefaultWith;
  } else if (projectType === ProjectType.MAVEN) {
    return preferences.openMavenWith || preferences.openDefaultWith;
  } else if (projectType === ProjectType.GRADLE) {
    return preferences.openGradleWith || preferences.openDefaultWith;
  } else if (projectType === ProjectType.XCODE) {
    return preferences.openXcodeWith || preferences.openDefaultWith;
  } else if (projectType === ProjectType.WAILS) {
    return preferences.openWailsWith || preferences.openDefaultWith;
  } else if (projectType === ProjectType.TAURI) {
    return preferences.openTauriWith || preferences.openDefaultWith;
  }
  return preferences.openDefaultWith;
}
