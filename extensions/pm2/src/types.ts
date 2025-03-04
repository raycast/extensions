import { Image } from "@raycast/api";

export type ProcessStatus = "online" | "stopping" | "stopped" | "launching" | "errored" | "one-launch-status";

export type Pm2Command = "start" | "stop" | "restart" | "reload" | "delete";

export type Pm2Process = number | string;

export type RuntimeOptions = {
  nodePath?: string;
};

export type ExportedKey = {
  key: string;
  icon?: Image.ImageLike;
  title?: string;
  render?: (value: number | string) => string;
};
