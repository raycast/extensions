export interface SyncFolders {
  id?: string;
  icon?: string;
  name?: string;
  source_folder?: string;
  dest_folder?: string;
  delete_dest?: boolean;
  last_sync?: Date;
}

export interface SyncFoldersFormValues extends Omit<SyncFolders, "source_folder" | "dest_folder"> {
  icon: string;
  name: string;
  source_folder: string[];
  dest_folder: string[];
  delete_dest: boolean;
}
