// Note: Preferences type is auto-generated in raycast-env.d.ts from package.json

// Domain Types
export type Workspace = {
  name: string;
  apiKey: string;
};

export type Organizer = {
  name: string;
  email: string;
};

export type Invitee = {
  name: string;
  email: string;
};

export type Meeting = {
  id: string;
  name: string;
  happenedAt: string;
  url: string;
  duration: number;
  organizer: Organizer;
  invitees: Invitee[];
};

export type MeetingsResponse = {
  page: number;
  pages: number;
  total: number;
  pageSize: number;
  results: Meeting[];
};

export type TranscriptSentence = {
  speaker: string;
  text: string;
  startTime: number;
  endTime: number;
};

export type TranscriptResponse = {
  id: string;
  meetingId: string;
  data: TranscriptSentence[];
};

export type HighlightTopic = {
  title: string;
  summary: string;
};

export type Highlight = {
  text: string;
  startTime: number;
  source: string;
  topic?: HighlightTopic;
};

export type HighlightsResponse = {
  meetingId: string;
  data: Highlight[];
};

// Cache Types
export interface CacheEntry<T> {
  data: T;
  timestamp: number;
}

// Filter Types
export type DateFilter = "all" | "today" | "week" | "month";

// Participant filter
export type ParticipantFilter = {
  type: "organizer" | "invitee" | "any";
  name: string;
};

// Export format
export type ExportFormat = "markdown" | "txt" | "json";

// Favorites storage
export interface FavoriteMeeting {
  id: string;
  name: string;
  url: string;
  addedAt: string;
}

// Search history
export interface SearchHistoryItem {
  query: string;
  timestamp: number;
}

// Deep link arguments
export interface OpenMeetingArguments {
  meetingId?: string;
  meetingUrl?: string;
}

// API Error Types
export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public statusText: string,
  ) {
    super(message);
    this.name = "ApiError";
  }

  get isUnauthorized(): boolean {
    return this.status === 401;
  }

  get isRateLimited(): boolean {
    return this.status === 429;
  }

  get isNotFound(): boolean {
    return this.status === 404;
  }
}
