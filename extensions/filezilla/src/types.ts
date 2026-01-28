// All of the types below are made out of FileZilla config files
export interface Server {
  Host: string;
  Port: number;
  Protocol: number;
  Type: number;
  User: string;
  Pass: string;
  Logontype: number;
  PasvMode: string;
  EncodingType: string;
  BypassProxy: number;
  Name: string;
  SyncBrowsing: number;
  DirectoryComparison: number;
  Path?: string;
}

export interface Folder {
  Server?: Server;
  Servers?: Server[];
  "#text": string;
}

export interface XMLFileContent {
  Folder?: Folder;
  Folders?: Folder[];
  Server?: Server;
  Servers?: Server[];
}

export type ContentToCheck = Folder | Server | undefined | (Folder | Server | undefined)[];
