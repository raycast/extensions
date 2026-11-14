export type { Card, Entry } from "daily-karte";

export interface Config {
  projectId: string;
  clientId: string;
  website: string;
}

export interface Session {
  config: Config;
  uid: string;
  email: string;
  idToken: string;
  expiresAt: number;
}
