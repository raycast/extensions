export interface Annotation {
  text: string;
  time?: number;
  timeEnd?: number;
  tags?: string[];
  dashboardId?: number;
  panelId?: number;
  id?: number;
  uniqueKey?: string;
}

export interface Patch {
  text?: string;
  tags?: string[];
  time?: number;
  timeEnd?: number;
}
