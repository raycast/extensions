export interface MemoryResult {
  memory: string;
  event?: string;
}

export interface Memory {
  id: string;
  memory?: string;
  user_id?: string;
  hash?: string;
  categories?: string[];
  created_at?: string;
  updated_at?: string;
  memory_type?: string;
  score?: number;
  metadata?: Record<string, unknown>;
  event?: string;
  messages?: Array<{ role: string; content: string }>;
  data?: { memory: string } | null;
}

export interface SearchResult {
  id: string;
  memory?: string;
  score?: number;
  user_id?: string;
  metadata?: Record<string, unknown>;
  categories?: string[];
  created_at?: string;
  updated_at?: string;
  memory_type?: string;
  event?: string;
}

export interface SearchResponse {
  results: SearchResult[];
}

export interface GetAllResponse {
  results: Memory[];
}

export interface Preferences {
  mem0ApiKey: string;
  defaultUserId: string;
}
