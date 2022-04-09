import { Color } from "@raycast/api";

export interface Torrent {
  title: string;
  pageLink: string;
  seeds: string;
  leeches: string;
  size: string;
  magnet: string | undefined | null;
  color: Color;
}

// health:
// color:red = Dead
// color:orange = Unhealthy
// color:green = Healthy
