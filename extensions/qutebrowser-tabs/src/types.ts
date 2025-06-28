export interface DebugInfo {
  locations_checked: string[];
  files_found: string[];
  errors: string[];
  qutebrowser_running?: boolean;
  qutebrowser_path?: string;
  autosave_path?: string;
  autosave_exists?: boolean;
  autosave_size?: number;
  autosave_modified?: string;
  autosave_age?: string;
  success_file?: string;
  success_file_size?: number;
  success_file_mtime?: string;
  tabs_found?: number;
  session_save_success?: boolean;
  session_file?: string;
  session_file_size?: number;
  session_file_age?: string;
  note?: string;
}

// Interfaces for the YAML session file structure
export interface HistoryEntry {
  url: string;
  title?: string;
  active?: boolean;
  pinned?: boolean;
}

export interface SessionTab {
  history: HistoryEntry[];
  active?: boolean;
  tabs?: SessionTab[];
}

export interface SessionWindow {
  tabs: SessionTab[];
}

export interface SessionData {
  windows: SessionWindow[];
}

export interface Tab {
  window: number;
  index: number;
  url: string;
  title: string;
  active: boolean;
  pinned?: boolean;
}

export interface Preferences {
  qutebrowserPath: string;
}
