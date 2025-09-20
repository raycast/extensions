import { MJMessage } from "midjourney";

export interface Preferences {
  sessionToken: string;
  channelId: string;
  serverId: string;
}
export interface Generation extends Partial<MJMessage> {
  progress: string;
  prompt: string;
  uri: string;
  timestamp: number;
  guid: string;
  type: "image" | "upscale";
  command: string;
}
