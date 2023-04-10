import { Color, Icon } from "@raycast/api";

export type Nullable<T> = T | null;

export type Nullish<T> = T | undefined | null;

export interface Preferences {
  sortBy: string;
}

export type Service = {
  id: string;
  country: string;
  name: string;
  url: string;
};

export type ServiceError = {
  title?: string;
  message: string;
};

export type TrackTypeName =
  | "fireplace"
  | "snowmobileroute"
  | "outdoorroute"
  | "skitrack"
  | "parking"
  | "skatefield"
  | "athleticfield"
  | "frisbee";

export interface BaseTrack {
  id: string;
  serviceId: string;
  type: TrackTypeName;
  name: string;
  description: string;
}

export interface TrackCondition {
  text: string;
  color: Color;
  icon: Icon;
}

type StatusText = "open" | "closed";

export interface TrackStatus {
  text: StatusText;
  color: Color;
  icon: Icon;
}

export interface Announcement {
  id: string;
  start: Date;
  end: Date;
  title: string;
  description: string;
  linkUrl?: string;
  linkBody?: string;
}

export interface Track extends BaseTrack {
  service: Service;
  maintenanceDate: Nullable<Date>;
  status: StatusText;
}

export type WithId = { id: string };

export type OnFavouriteTracksUpdateAction = (favouriteTracks: BaseTrack[]) => void;
