export interface WrikeTask {
  id: string;
  title: string;
  description: string;
  briefDescription: string;
  status: string;
  permalink: string;
}

export interface SearchState {
  query: string;
  results: WrikeTask[];
  isLoading: boolean;
}

export interface Preferences {
  token: string;
}

export interface WrikeUser {
  id: string;
  firstName: string;
  lastName: string;
  profiles: UserProfile[];
  me: boolean;
}

export interface WrikeResponse<T> {
  kind: string;
  data: T[];
}

export interface APIError {
  error: string;
  errorDescription: string;
}

interface UserProfile {
  accountId: string;
  email: string;
}
