export interface Preferences {
  clientId: string;
  authorization: string;
  streamlink?: string;
  lowlatency?: boolean;
  quality?: string;
  primaryaction?: PrimaryAction;
}

export enum PrimaryAction {
  Browser = "web",
  Streamlink = "streamlink",
}
