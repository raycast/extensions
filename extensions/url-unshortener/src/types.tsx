import { Icon } from "@raycast/api";

export interface RedirectionStep {
  step: string;
  url: string;
}

export interface FaviconUrls {
  [key: string]: string | Icon;
}
