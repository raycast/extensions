import { Application } from "@raycast/api";

export interface AppItem extends Application {
  icon: string;
  isSystemApp: boolean;
  location: string;
  brand: string;
}
