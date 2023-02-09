import { ListIcons, ListTypes, ListVisualizations } from "../utils/list";

export type ListIcon = (typeof ListIcons)[number]["value"];

export type ListType = (typeof ListTypes)[number]["value"];

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
  type: ListType;
  reserved: boolean;
  createdAt: string;
  updatedAt: string;
  defaultList: boolean;
  url: string;
  appearance?: {
    icon: ListIcon;
    hue: number | null;
    iconUrl: string;
  };
};

export type ApiListResponse = {
  list: ListObject[];
};

export type CreateListFormValues = {
  name: string;
  type: string;
  description?: string;
  hue: string;
  icon: string;
  visualization?: string;
};

export type UpdateListFormValues = Omit<CreateListFormValues, "icon">;

export type CreateListPayload = Omit<CreateListFormValues, "hue", "icon"> & {
  appearance?: {
    hue: number | null;
    icon: ListIcon;
  };
};

export type UpdateListPayload = Partial<Omit<UpdateListFormValues, "hue">> & {
  appearance?: {
    hue?: number | null;
    icon?: ListIcon;
  };
};
