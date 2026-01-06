export interface LinearIssue {
  id: string;
  identifier: string;
  url: string;
}

export interface CreateIssueResponse {
  ok: boolean;
  issue?: LinearIssue;
  error?: string;
}

export interface Preferences {
  supabaseUrl: string;
}
