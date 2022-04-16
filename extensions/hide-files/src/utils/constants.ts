export enum LocalStorageKey {
  LOCAL_HIDE_DIRECTORY = "localHideDirectory",
  LOCAL_HIDE_TOGGLE = "localHideToggle",
}

export const scriptFinderPath = `
if application "Finder" is not running then
    return "Finder not running"
end if

tell application "Finder"
    return POSIX path of ((insertion location) as alias)
end tell
`;

export const scriptToggleFinderFileVisibility = (visibility: boolean) => `
if application "Finder" is not running then
    return "Finder not running"
end if

tell application "Finder" to quit    
tell application "System Events" to do shell script "defaults write com.apple.finder AppleShowAllFiles -bool ${visibility}"
tell application "Finder" to launch
`;

export const imgExt = [
  ".cr2",
  ".cr3",
  ".gif",
  ".gif",
  ".heic",
  ".heif",
  ".icns",
  ".icon",
  ".icons",
  ".jpeg",
  ".jpg",
  ".jpg",
  ".png",
  ".raf",
  ".raw",
  ".svg",
  ".tiff",
  ".webp",
];
