import { Application } from "@raycast/api";

export interface AppItem extends Application {
  location: string;
  brand: string;
}

export type SomeObject = {
  [key: string]: number | string | boolean | SomeObject | null | undefined;
};

export type UninstallerApp = {
  id: string;
  name: string;
  path: string;
  icon: string;
  url: string;
};
