import { Speed } from "../../lib/speedtest.types";

export type InternetSpeed = {
  download: Speed;
  upload: Speed;
};

export type InternetSpeedLite = {
  download: number;
  upload: number;
};

export type Nullish<T> = {
  [key in keyof T]: T[key] | undefined;
};

export type ActivitySpeedQuality = {
  [key: string]: InternetSpeedLite;
};
