import {
  Icon,
} from '@raycast/api';

export interface ProjectInterface {
  name: string;
  description: string;
  icon: string | Icon;
  target: string;
}

export interface PackageJSONInterface {
  title: string;
  name: string;
  description: string;
  icon: string;
  version: string;
  author: string;
}

export interface PreferencesInterface {
  devDir: string;
}
