import { Icon } from "@raycast/api";

export interface RedirectionStep {
  url: string;
  statusCode: number;
  statusName: string;
}

export interface FaviconUrls {
  [key: string]: string | Icon;
}
