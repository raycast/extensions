export interface LoginPayload {
  email: string;
  password: string;
}

export interface Bookmark {
  name: string;
  description?: string;
  url: string;
  id: string;
  favicon: string;
  weight: number
}

export interface Organization {
  id: string;
  name: string;
}
