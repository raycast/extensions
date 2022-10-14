export interface ITeam {
  id: number;
  owner_id: number;
  name: string;
  created_at: string;
}

export type BackupState = "initiated" | "error" | "running" | "success";

export interface IResource {
  id: number;
  server_id: number;
  storage_id: number;
  type: string;
  name: string;
  db_type?: string;
  schedule: string;
  schedule_cron: string | null;
  status: boolean;
  retention: number;
  created_at: string;
  db_name?: string;
  file_path?: string | null;
  excluded_file_path?: string | null;
  storage: Storage;
  server: Server;
  flags: object;
  last_file_backup: BackupLog | null;
  last_db_backup: BackupLog | null;
  trigger_url: string;
}

export type BackupsResponse = {
  data?: IResource[];
};

export type BackupRunResponse = {
  success: boolean;
  message: string;
  errors: string[];
  data: {
    created_at: string;
    filename: string;
    filesize: string | null;
    id: number;
    status: string;
    type: string;
  };
};

export type Storage = {
  id: number;
  name: string;
  type: string;
};

export type Server = {
  id: number;
  name: string;
  connection_type: string;
};

export type BackupLog = {
  download_url: string | null;
  restore_command: string | null;
  filename: string | null;
  filesize: string | null;
  status: BackupState;
  created_at: string;
  created_at_human: string;
};

export type BackupGroups = {
  db: IResource[];
  file: IResource[];
  full: IResource[];
  sync: IResource[];
};
