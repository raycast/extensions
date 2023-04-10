import type { Application } from "@raycast/api";

export interface Preferences {
  browser: Application;
  localhost: string;
  production: string;
}

export interface Host {
  host: string;
  isLocal: boolean;
}

export type HostsDictionary = Record<string, Host>;
