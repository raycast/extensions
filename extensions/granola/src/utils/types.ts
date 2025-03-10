import { ReactNode } from "react";

// Main response interface
export interface GetDocumentsResponse {
  docs: Document[];
  deleted: string[];
}

// Document interface
export interface Document {
  id: string;
  created_at: string;
  notes: Notes;
  title: string;
  user_id: string;
  cloned_from: string | null;
  notes_plain: string;
  transcribe: boolean;
  google_calendar_event: null;
  updated_at: string;
  deleted_at: null;
  type: null;
  overview: null;
  public: boolean;
  people: People | null;
  chapters: null;
  meeting_end_count: number;
  notes_markdown: string;
  selected_template: null;
  valid_meeting: boolean;
  summary: null;
  affinity_note_id: null;
  has_shareable_link: boolean;
  show_private_notes: boolean;
  hubspot_note_url: null | string;
  creation_source: string;
  subscription_plan_id: string;
  status: null | string;
  external_transcription_id: null | string;
  audio_file_handle: null | string;
  privacy_mode_enabled: boolean;
  workspace_id: null | string;
  visibility: null | string;
  sharing_link_visibility: string;
  notification_config: null;
}

export type Doc = {
  id: string;
  title: string;
  created_at: string;
  creation_source: string;
  public: boolean;
  notes_markdown: string;
  sharing_link_visibility: string;
};

// Notes structure
export interface Notes {
  type: string;
  content: NoteContent[];
}

export interface NoteActionsProps {
  doc: Doc;
  panels: {
    [key: string]: {
      [key: string]: {
        original_content: string;
      };
    };
  };
  children?: ReactNode;
}

// Note content types
type NoteContent = ParagraphContent;

// Paragraph content
export interface ParagraphContent {
  type: "paragraph";
  attrs: {
    id: string;
    timestamp: string | null;
    "timestamp-to": null;
  };
  content?: TextContent[];
}

// Text content
export interface TextContent {
  type: "text";
  text: string;
}

// People information
export interface People {
  creator: Creator;
  attendees: Attendee[];
}

// Creator information
export interface Creator {
  name: string;
  email: string;
  details: {
    person: {
      name: {
        fullName: string;
      };
      avatar: string;
      linkedin: {
        handle: string;
      };
      employment: {
        name: string;
        title: string;
      };
    };
    company: {
      name: string;
    };
  };
}

export interface Attendee {
  name?: string;
  email?: string;
}
