export interface ChuckFact {
  created_at: string;
  updated_at: string;
  icon: string;
  id: string;
  url: string;
  value: string;
}

export interface Preferences {
  category: string;
}

export interface ApiError {
  code: string;
  error: string;
}
