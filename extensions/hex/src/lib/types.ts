export type DoneReply = {
  status: "done";
  message: string;
  changed: boolean;
};

export type StatusReply = {
  status: "status";
  app_version: string;
  listener: { running: boolean; status: string };
  capture: {
    state: "idle" | "recording" | "transcribing" | "unknown";
    recording: "dictation" | "service" | null;
    pending_jobs: number;
  };
  meeting: {
    state: "idle" | "starting" | "recording" | "transcribing";
    title: string | null;
    elapsed_seconds: number | null;
  };
  model: { id: string; name: string; language: string | null };
  features: { meetings: boolean; history_retention: string };
  labs?: string[];
};

export type HistoryKind =
  "dictation" | "send" | "voice_action" | "printed" | "raw";

export type HistoryEntry = {
  id: number;
  timestamp_ms: number;
  application: string | null;
  mode: string | null;
  kind: HistoryKind;
  final_text: string;
  raw_text?: string;
  score?: number;
  snippet?: string;
  recording?: string;
};

export type HistoryReply = {
  version: 1;
  retention: "off" | "day" | "week" | "month" | "forever";
  truncated: boolean;
  entries: HistoryEntry[];
};

export type Meeting = {
  id: string;
  title: string;
  timestamp_ms: number;
  duration_ms: number;
  application: string | null;
  status:
    | "starting"
    | "recording"
    | "transcribing"
    | "complete"
    | "interrupted"
    | "failed";
  in_progress: boolean;
  transcript_source: "final" | "rolling" | "missing" | "draft";
  warnings: string[];
};

export type MeetingListReply = {
  version: 1;
  meetings: Meeting[];
  skipped: { id: string; reason: string }[];
  truncated: boolean;
};

export type Setting = {
  key: string;
  value: unknown;
  kind: string;
};

export type SettingsReply = { status: "settings"; settings: Setting[] };

export type VocabularyEntry = { term: string; sounds_like?: string[] };

export type VocabularyReply = {
  status: "vocabulary";
  entries: VocabularyEntry[];
};

export type Model = {
  id: string;
  name: string;
  languages: string[];
  size: string;
  installed: boolean;
  selected: boolean;
  source?: string;
};

export type ModelsReply = { status: "models"; models: Model[] };

export type Annotation = {
  id: string;
  bundle: string;
  created_at_ms: number;
  duration_ms: number | null;
  mode: string | null;
  app: string | null;
  words: number;
  sent_to: { session: string; title: string } | null;
  queued: boolean;
};

export type AnnotationListReply = {
  status: "scrawl-captures";
  captures: Annotation[];
};

export type AnnotationDetail = Annotation & {
  status: "scrawl-capture-detail";
  window_title: string | null;
  transcript: string | null;
  note: string | null;
  missing_transcript: string | null;
  marks: number;
  keyframes: number;
  video: string | null;
  audio: string | null;
  contact_sheet: string | null;
};

export type AnnotationStatusReply = {
  status: "scrawl-capture";
  changed: boolean;
  state: string;
  bundle: string | null;
};
