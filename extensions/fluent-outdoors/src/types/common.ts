import { Color, Icon } from "@raycast/api";

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

// Track to ser
export interface BaseTrack {
  id: string;
  serviceId: string;
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
  maintenanceDate: Date | null;
  status: StatusText;
}

export type WithId = { id: string };

export type OnFavouriteTracksUpdateAction = (favouriteTracks: BaseTrack[]) => void;
