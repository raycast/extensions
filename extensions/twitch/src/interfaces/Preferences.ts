export interface Preferences {
  /** Primary Action - Set the default action */
  primaryaction: PrimaryAction;
  /** Location of Streamlink binary - Use 'where streamlink' or install via brew install streamlink */
  streamlink: string;
  /** Stream Latency - VLC Player is required for low latency streams */
  lowlatency: boolean;
  /** Custom Streamlink Config - (optional) Path to custom streamlink config file */
  streamlinkConfig?: string;
  /** Video Quality - Standard video quality */
  quality: "best" | "720p" | "480p" | "worst";
  /** Client ID (deprecated) - Twitch ClientId https://twitchapps.com/tokengen/ */
  clientId: string;
  /** Authorization Token (deprecated) - Twitch Bearer Token (Must be matching with ClientId) https://twitchapps.com/tokengen/ */
  authorization: string;
  /** Time Notation - Choose the time notation */
  timeNotation: TimeNotation;
}

export enum TimeNotation {
  TwentyFout = "24h",
  Twelve = "12h",
}

export enum PrimaryAction {
  Browser = "web",
  Streamlink = "streamlink",
}
