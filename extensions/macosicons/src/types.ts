import { Hit } from "@algolia/client-search";

export type IconDetails = {
  appName: string;
  lowResPngUrl: string;
  iOSUrl?: string;
  icnsUrl: string;
  approved: boolean;
  downloads: number;
  timeStamp: number;
  usersName: string;
};

export type IconHit = Hit<IconDetails>;

export type IconStorageItem = IconHit & {
  date: string;
  // icnsLocalPath: string,
  // lowResPngLocalPath: string
};
