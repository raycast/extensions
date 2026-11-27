export type BrowserType =
  "firefox" | "chrome" | "brave" | "edge" | "arc" | "safari";

export type BundleCategory =
  "browser" | "developer" | "system" | "multimedia" | "general";

export interface RawProcess {
  pid: number;
  ppid: number;
  cpu: number;
  rssKb: number;
  command: string;
}

export interface ChildProcessInfo {
  pid: number;
  ppid: number;
  cpu: number;
  rssBytes: number;
  command: string;
  functionalLabel: string;
  isHot: boolean;
}

export interface ProcessBundle {
  id: string;
  name: string;
  bundlePath?: string;
  category: BundleCategory;
  browserType?: BrowserType;
  mainPid: number;
  totalCpu: number;
  totalRssBytes: number;
  processCount: number;
  hotWorker?: ChildProcessInfo;
  children: ChildProcessInfo[];
}

export type SortOrder = "cpu" | "memory" | "children" | "name";

export type FilterCategory = "all" | "browser" | "developer" | "system" | "hot";
