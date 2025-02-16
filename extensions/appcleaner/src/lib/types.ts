import { Application } from "@raycast/api";

export interface AppItem extends Application {
  icon: string;
  location: string;
  brand: string;
}
