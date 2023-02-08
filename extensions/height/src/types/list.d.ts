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
};

export type CreateListFormValues = {
  name: string;
  type: string;
  description?: string;
  hue: string;
  icon: string;
  visualization?: string;
};

export type CreateListPayload = Omit<CreateListFormValues, "hue", "icon"> & {
  appearance?: {
    hue: number | null;
    icon: ListIcon;
  };
};
