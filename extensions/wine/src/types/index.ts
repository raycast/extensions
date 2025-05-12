export interface WinePreferences {
  wineBinaryPath?: string;
  additionalDesktopDirs?: string;
}

export interface ApplicationItem {
  id: string;
  name: string;
  exec: string;
  iconValue?: string;
  resolvedIconPath?: string;
  pathValue?: string;
  comment?: string;
}
