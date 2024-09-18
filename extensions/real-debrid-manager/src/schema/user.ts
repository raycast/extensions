export type UserData = {
  id: number;
  username: string;
  email: string;
  points: number;
  locale: string;
  avatar: string;
  type: "premium" | "free";
  premium: number;
  expiration: string;
};

type HostInfo = {
  left: number;
  type: keyof typeof TrafficType;
  bytes?: number;
  links?: number;
  limit?: number;
  extra?: number;
  reset?: keyof typeof TrafficReset;
};

export type TrafficData = {
  [hostDomain: "remote" | string]: HostInfo;
};

export enum TrafficType {
  megabytes = "MB",
  gigabytes = "GB",
  links = "Links",
}

export enum TrafficReset {
  daily = "Day",
  weekly = "Week",
  monthly = "Month",
}
