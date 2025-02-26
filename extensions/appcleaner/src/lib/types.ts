import { Application } from "@raycast/api";

export interface AppItem extends Application {
  location: string;
  brand: string;
}
