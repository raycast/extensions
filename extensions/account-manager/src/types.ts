export interface Account {
  id: string;
  project: string;
  environment: string;
  role: string;
  username: string;
  password?: string;
  notes?: string;
  url?: string;
}
