import { ListColors, ListIcons, ListTypes, ListVisualizations } from "@/utils/list";

export type ListIcon = (typeof ListIcons)[number]["value"];

export type ListType = (typeof ListTypes)[number]["value"];

export type ListHue = (typeof ListColors)[number]["value"];

export type ListColor = typeof ListColors;

export type ListVisualization = (typeof ListVisualizations)[number]["value"];

export interface ListObject {
  id: string;
  model: "list";
  name: string;
  archivedAt?: string;
  archivedBy?: string;
  description: string;
  filters: Filters;
  fields: Field[];
  fieldsSummaries: FieldsSummaries;
  sortBy: SortBy;
  viewBy?: ViewBy;
  viewByMobile?: ViewByMobile;
  visualization: ListVisualization;
  key: string;
  userId: string;
  type: ListType;
  reserved: boolean;
  showCompletedTasks: string;
  subtaskHierarchy: string;
  appearance?: Appearance;
  createdAt: string;
  updatedAt: string;
  updatedBy: string;
  defaultList: boolean;
  url: string;
  topActiveUsersIds: string[];
  totalActiveUsersCount: number;
  calendarVisualizationOptions: CalendarVisualizationOptions;
  ganttVisualizationOptions: GanttVisualizationOptions;
  searchTopResultCount: number;
  searchHighlightMode: string;
  memberAccess: string;
}

export interface CreateListFormValues extends Pick<ListObject, "name" | "description"> {
  type: string;
  visualization: string;
  hue: string;
  icon: string;
}

export interface CreateListPayload extends Omit<CreateListFormValues, "hue" | "icon"> {
  appearance?: {
    hue: Appearance["hue"];
    icon: ListIcon;
  };
}

export type UpdateListFormValues = Omit<CreateListFormValues, "icon">;

export interface UpdateListPayload extends Partial<Omit<UpdateListFormValues, "hue">> {
  appearance?: {
    hue?: Appearance["hue"];
    icon?: ListIcon;
  };
  archivedAt?: string;
}

export interface Filters {
  listIds?: {
    values: string[];
  };
  trashed?: {
    values: boolean[];
  };
  assigneesIds?: {
    values: string[];
  };
}

export interface Field {
  id: string;
  format?: Format;
}

export interface Format {
  dateTextStyle: string;
}

export interface FieldsSummaries {
  name: {
    type: string;
  };
}

export interface SortBy {
  type: string;
  sorts?: Sort[];
  sort?: string;
}

export interface Sort {
  order: string;
  fieldId: string;
}

export interface ViewBy {
  id: string;
  alwaysShowCurrentUser: boolean;
  alwaysShowTodoAndDone: boolean;
  visibility: string;
}

export interface ViewByMobile {
  id: string;
  alwaysShowCurrentUser: boolean;
  alwaysShowTodoAndDone: boolean;
  visibility: string;
}

export interface Appearance {
  icon: ListIcon;
  hue?: number | null;
  iconUrl: string;
}

export interface CalendarVisualizationOptions {
  showWeekends: boolean;
}

export interface GanttVisualizationOptions {
  zoomLevel: number;
  sidebarCollapsed: boolean;
  sidebarWidth: number;
  dateUnit: string;
}
