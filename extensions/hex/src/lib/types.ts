export type DoneReply = {
  status: "done";
  message: string;
  changed: boolean;
};

export type StatusReply = {
  status: "status";
  capture: { recording: "dictation" | "service" | null };
  meeting: { state: "idle" | "starting" | "recording" | "transcribing" };
};

export type HistoryKind = "dictation" | "send" | "voice_action" | "printed" | "raw";

export type HistoryEntry = {
  id: number;
  timestamp_ms: number;
  application: string | null;
  mode: string | null;
  kind: HistoryKind;
  final_text: string;
  raw_text?: string;
  recording?: string;
};

export type HistoryReply = {
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
  status: "starting" | "recording" | "transcribing" | "complete" | "interrupted" | "failed";
  in_progress: boolean;
};

export type MeetingListReply = {
  meetings: Meeting[];
  truncated: boolean;
};

export type SettingsReply = {
  status: "settings";
  settings: { key: string; value: unknown }[];
};

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
};

export type ModelsReply = { status: "models"; models: Model[] };

export type Annotation = {
  id: string;
  bundle: string;
  created_at_ms: number;
  duration_ms: number | null;
  app: string | null;
  words: number;
  sent_to: { title: string } | null;
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
  contact_sheet: string | null;
};

export type AnnotationStatusReply = {
  status: "scrawl-capture";
  changed: boolean;
  state: string;
};
