export interface Recording {
  id: string;
  title: string;
  description?: string;
  date: string;
  duration: number;
  participants: string[];
  tags: string[];
  highlights?: Highlight[];
  transcript?: Transcript;
  summary?: Summary;
  url: string;
  thumbnailUrl?: string;
  status: "processing" | "ready" | "failed";
  createdAt: string;
  updatedAt: string;
  meetingType: "zoom" | "google_meet" | "teams";
}

export interface Highlight {
  id: string;
  text: string;
  timestamp: number;
  speaker?: string;
  tags?: string[];
}

export interface Transcript {
  segments: TranscriptSegment[];
  fullText?: string;
}

export interface TranscriptSegment {
  speaker: string;
  text: string;
  timestamp: number;
  duration: number;
}

export interface Summary {
  text: string;
  keyPoints: string[];
  actionItems?: ActionItem[];
  decisions?: string[];
}

export interface ActionItem {
  text: string;
  assignee?: string;
  dueDate?: string;
  status: "pending" | "completed";
}

export interface SearchResult {
  recording: Recording;
  relevanceScore: number;
  matchedFields: string[];
  snippet?: string;
}

export interface ApiResponse<T> {
  data?: T;
  error?: string;
  status: number;
  message?: string;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
}

export interface SearchParams {
  query: string;
  filters?: SearchFilters;
  page?: number;
  pageSize?: number;
  sortBy?: "relevance" | "date" | "duration";
  sortOrder?: "asc" | "desc";
}

export interface SearchFilters {
  dateFrom?: string;
  dateTo?: string;
  participants?: string[];
  tags?: string[];
  meetingType?: ("zoom" | "google_meet" | "teams")[];
  durationMin?: number;
  durationMax?: number;
  hasTranscript?: boolean;
  hasSummary?: boolean;
}

export interface User {
  id: string;
  email: string;
  name: string;
  avatar?: string;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken?: string;
  expiresAt?: string;
}
