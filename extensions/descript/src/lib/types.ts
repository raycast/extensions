export type JobState = "queued" | "running" | "stopped" | "failed" | "cancelled" | string;

export type JobResultStatus = "success" | "partial_success" | "failure" | string;

// API value for project-media imports is `import/project_media` (see docs.descriptapi.com).
// Extra union members support job snapshots cached by earlier extension versions.
export type JobType =
  | "import/project_media"
  | "import"
  | "import_project_media"
  | "agent"
  | "publish"
  | "transcribe"
  | "export"
  | string;

export type DescriptJob = {
  job_id: string;
  job_type: JobType;
  job_state: JobState;
  project_id?: string;
  project_url?: string;
  created_at?: string;
  updated_at?: string;
  /**
   * ISO timestamp when the job reached a terminal state (`stopped`, `failed`,
   * or `cancelled`). Returned by the API for terminal jobs only — see the
   * `/v1/jobs/{id}` response sample at https://docs.descriptapi.com/.
   */
  stopped_at?: string;
  progress?: {
    label?: string;
    percent?: number;
    last_update_at?: string;
  };
  result?: {
    status?: JobResultStatus;
    agent_response?: string;
    created_compositions?: Array<{ id: string; name: string }>;
    share_url?: string;
    download_url?: string;
    message?: string;
  };
  error?: {
    code?: string;
    message?: string;
  };
};

export type DescriptComposition = {
  id: string;
  name: string;
  /** Composition duration in seconds (detail endpoint only). */
  duration?: number;
  /** "video" or "audio" — detail endpoint only. */
  media_type?: string;
};

export type DescriptMediaFile = {
  type?: string;
  duration?: number;
};

export type DescriptProject = {
  id: string;
  name: string;
  project_url?: string;
  created_at?: string;
  updated_at?: string;
  drive_id?: string;
  folder_path?: string;
  /** Map of display path → media metadata. Returned by the detail endpoint. */
  media_files?: Record<string, DescriptMediaFile>;
  compositions?: DescriptComposition[];
};

export type ProjectsResponse = {
  projects: DescriptProject[];
  cursor?: string | null;
};

export type JobsResponse = {
  jobs: DescriptJob[];
  cursor?: string | null;
};

export type SignedUploadEntry = {
  upload_url: string;
  asset_id?: string;
  artifact_id?: string;
};

export type ImportJobStart = {
  job_id: string;
  project_id: string;
  project_url?: string;
  upload_urls?: Record<string, SignedUploadEntry>;
};

export type AgentJobStart = {
  job_id: string;
  project_id?: string;
  project_url?: string;
};

export type PublishJobStart = {
  job_id: string;
  project_id: string;
  project_url?: string;
  drive_id?: string;
};

export type PublishMediaType = "Video" | "Audio";
export type PublishResolution = "480p" | "720p" | "1080p" | "1440p" | "4K";
export type PublishAccessLevel = "public" | "unlisted" | "drive" | "private";

export type JobTypeFilter = "import/project_media" | "agent";
