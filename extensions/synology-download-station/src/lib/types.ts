export interface SynologyAuthResponse {
  success: boolean;
  data?: {
    sid: string;
    did?: string;
  };
  error?: {
    code: number;
  };
}

export interface SynologyTask {
  id: string;
  title: string;
  size: number;
  status: TaskStatus;
  type: TaskType;
  username: string;
  additional?: {
    detail?: {
      completed_time?: number;
      connected_leechers?: number;
      connected_peers?: number;
      connected_seeders?: number;
      create_time?: number;
      destination?: string;
      seedelapsed?: number;
      started_time?: number;
      total_peers?: number;
      total_pieces?: number;
      unzip_password?: string;
      uri?: string;
      waiting_seconds?: number;
    };
    transfer?: {
      downloaded_pieces?: number;
      size_downloaded: number;
      size_uploaded: number;
      speed_download: number;
      speed_upload: number;
    };
  };
}

export interface SynologyTasksResponse {
  success: boolean;
  data?: {
    offset: number;
    tasks: SynologyTask[];
    total: number;
  };
  error?: {
    code: number;
  };
}

export interface SynologyCreateTaskResponse {
  success: boolean;
  error?: {
    code: number;
  };
}

export type TaskStatus =
  | "waiting"
  | "downloading"
  | "paused"
  | "finished"
  | "finishing"
  | "extracting"
  | "error"
  | "seeding";

export type TaskType = "bt" | "nzb" | "http" | "ftp" | "emule";

export interface ExtensionPreferences {
  nasUrl: string;
  username: string;
  password: string;
}

export interface SynologyCredentials {
  url: string;
  username: string;
  password: string;
  sessionId?: string;
}

export interface TaskCreateRequest {
  uri: string;
  destination?: string;
}

export interface TaskProgress {
  percentage: number;
  downloadedSize: number;
  totalSize: number;
  downloadSpeed: number;
  uploadSpeed: number;
}
