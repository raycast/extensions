import { Application } from "@raycast/api";

export interface CodePreferences {
  directory: string;
  unzip: boolean;
  showInFinder: boolean;
  openInIDE: boolean;
  ide: Application;
}
