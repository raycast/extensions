export type WebVersion = {
  version: string;
  commit: string;
  branch: string;
  date: string;
  mode: string;
};

export type BridgeVersion = {
  Version: string;
  Revision: string;
  ReleaseDate: string;
  ReleaseNotes: string;
  ReleaseFixedBugs: string;
  FixedBugs: string;
  LandingPage: string;
  URL: string;
  InstallerFile: string;
  UpdateFile: string;
};

export type ProtonProduct = "proton-mail" | "proton-drive" | "proton-calendar" | "proton-account";

export type WebEnv = "default" | "beta";
export type BridgeSupportedOS = "macos" | "windows" | "linux";
