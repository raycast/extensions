export interface Host {
  host: string;
  isLocal: boolean;
}

export type HostsDictionary = Record<string, Host>;
