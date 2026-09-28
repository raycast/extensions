export interface BrowserProfile {
  id: string;
  browserId: string;
  browserName: string;
  profileName: string;
  displayName: string;
  profileDirectory: string;
  executablePath: string;
  userDataDir?: string;
  iconPath?: string;
  avatarPath?: string;
  fallbackIcon: string;
  email?: string;
  isCustom?: boolean;
  isFavorite?: boolean;
}

export interface CustomProfileData {
  id: string;
  browserName: string;
  profileName: string;
  executablePath: string;
  profileDirectory: string;
  browserType?: "chromium" | "firefox";
  browserId?: string;
  userDataDir?: string;
}
