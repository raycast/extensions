import { Nullish } from "./common";

export interface Feature {
  id: string;
  type: string;
  geometry: Geometry;
  properties: Properties;
}

export type FeatureInfo = {
  enabled: boolean;
  vehicles: unknown;
  cache: unknown;
};

export interface Environment {
  name: string;
  forecastUrl: string;
  mapCenter: number[];
  venues: [];
  defaultVenueType: string;
  mapUrl: string;
  features: Record<"kunto" | "lipas", FeatureInfo>;
  id: string;
  auth: string;
  version: string;
  branch: string;
  commit: string;
  build: string;
  profiles: string;
}

export interface Geometry {
  type: string;
  coordinates: number[][];
}

export interface Maintenance {
  latest: Date;
  manual: Date;
  kunto?: Date;
}

export interface Meta {
  createdBy: string;
  createdDate: Date;
  lastModifiedBy: string;
  lastModifiedDate: Date;
  version: number;
}

export type Status = "open" | "closed";

export interface Properties {
  id: string;
  name: string;
  externalId?: string;
  controlPointId: number;
  groupId: string;
  description: string;
  status: Status;
  type: string;
  isPublic: boolean;
  maintenance: Maintenance;
  meta: Meta;
}

export interface Notice {
  id: string;
  start: string | Date;
  end: string | Date;
  title: string;
  description: string;
  linkUrl?: Nullish<string>;
  linkBody?: any;
  type: string;
  isPublic: boolean;
  geometry?: unknown | null;
  meta: Meta;
}
