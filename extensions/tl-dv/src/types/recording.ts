export interface Recording {
  id: string;
  title: string;
  created_at: string;
  updated_at: string;
  duration: number; // in seconds
  url: string;
  thumbnail_url?: string;
  meeting_platform?: "zoom" | "google-meet" | "teams" | "webex" | string;
  participants?: Participant[];
  tags?: string[];
  folder_id?: string;
  is_shared?: boolean;
  share_link?: string;
}

export interface RecordingDetail extends Recording {
  transcript?: Transcript;
  notes?: string;
  key_moments?: KeyMoment[];
}

export interface Participant {
  id: string;
  name: string;
  email?: string;
  role?: string;
}

export interface KeyMoment {
  timestamp: number;
  title: string;
  description?: string;
}
