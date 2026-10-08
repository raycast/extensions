export interface SyncFolders {
  id?: string;
  icon?: string;
  name?: string;
  source_folder?: string;
  dest_folder?: string;
  delete_dest?: boolean;
  exclude_patterns?: string;
  last_sync?: Date;
}

export interface SyncFoldersFormValues extends Omit<SyncFolders, "source_folder" | "dest_folder"> {
  icon: string;
  name: string;
  source_folder: string[];
  dest_folder: string[];
  delete_dest: boolean;
  exclude_patterns?: string;
}

export interface SyncHistoryEntry {
  id: string;
  name: string;
  source_folder: string;
  dest_folder: string;
  delete_dest: boolean;
  success: boolean;
  error?: string;
  fileCount?: number;
  duration: number;
  timestamp: string;
}
