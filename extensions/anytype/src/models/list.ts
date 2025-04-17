export interface View {
  id: string;
  name: string;
  layout: ViewLayout;
  filters: Filter[];
  sorts: Sort[];
}

export enum ViewLayout {
  Grid = "grid",
  List = "list",
  Gallery = "gallery",
  Kanban = "kanban",
  Calendar = "calendar",
  Graph = "graph",
}

export interface Filter {
  id: string;
  property_key: string;
  format: string;
  condition: string;
  value: string;
}

export interface Sort {
  id: string;
  property_key: string;
  format: string;
  sort_type: string;
}
