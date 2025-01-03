import { Application } from "@raycast/api";

export interface Preferences {
  debugMode: boolean;
}

export interface AppListProps {
  isLoading: boolean;
  applications: Application[];
  setSelectedApp: (app: Application | null) => void;
  setRelatedFiles: (files: string[]) => void;
  setCurrentView: (view: "appList" | "fileList") => void;
}

export interface FileListProps {
  selectedApp: Application | null;
  allFiles: string[];
  loadApplications: () => Promise<void>;
  totalSize: string;
  setCurrentView: (view: "appList" | "fileList") => void;
  setSelectedApp: (app: Application | null) => void;
  setRelatedFiles: (files: string[]) => void;
}
