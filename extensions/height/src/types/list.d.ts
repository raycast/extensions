import { ListColors, ListIcons, ListTypes, ListVisualizations } from "../utils/list";

export type ListIcon = (typeof ListIcons)[number]["value"];

export type ListType = (typeof ListTypes)[number]["value"];

export type ListHue = (typeof ListColors)[number]["value"];

export type ListColor = typeof ListColors;

export type ListVisualization = (typeof ListVisualizations)[number]["value"];

export type ListObject = {
  id: string;
  model: "list";
  name: string;
  archivedAt: string | null;
  archivedBy: string | null;
  description: string;
  visualization: ListVisualization;
  key: string;
  userId?: string;
  type: ListType;
  reserved: boolean;
  appearance?: {
    icon: ListIcon;
    hue: number | null;
    iconUrl: string;
  };
  createdAt: string;
  updatedAt: string;
  defaultList: boolean;
  url: string;
  topActiveUserIds: string[];
  totalActiveUsersCount: number;
};

export type CreateListFormValues = Pick<ListObject, "name" | "description"> & {
  type: string;
  visualization: string;
  hue: ListObject["appearance"]["hue"];
  icon: ListObject["appearance"]["icon"];
};

export type CreateListPayload = Omit<CreateListFormValues, "hue", "icon"> & {
  appearance?: {
    hue: ListObject["appearance"]["hue"];
    icon: ListIcon;
  };
};

export type UpdateListFormValues = Omit<CreateListFormValues, "icon">;

export type UpdateListPayload = Partial<Omit<UpdateListFormValues, "hue">> & {
  appearance?: {
    hue?: ListObject["appearance"]["hue"];
    icon?: ListIcon;
  };
  archivedAt?: string;
};
