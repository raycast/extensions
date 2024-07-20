export interface Project {
  name: string;
  customLinks: CustomLink[];
  databaseIds?: number[];
  grafanaDashboardIds?: number[];
}

export interface GrafanaDashboard {
  id: number;
  name: string;
  url: string;
}

export interface Database {
  id: number;
  name: string;
  clusterName: string;
  fullClusterName: string;
  url: string;
  dc: string;
}

export interface CustomLink {
  name: string;
  url: string;
}

export interface TemplateUrl {
  name: string;
  templateUrl: string;
  type: string;
}

export interface Config {
  projects?: Project[];
  customLinks?: CustomLink[];
  databases?: Database[];
  grafanaDashboards?: GrafanaDashboard[];
  templates?: TemplateUrl[];
}