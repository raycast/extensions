export type ListIcon =
  | "list"
  | "listCircles"
  | "listTriangle"
  | "listSquare"
  | "listLines"
  | "listRectangles"
  | "listCircle"
  | "listRocket"
  | "listMushroom"
  | "listBolt"
  | "listBug"
  | "listFlower"
  | "listThumbsUp"
  | "listTarget"
  | "listSparkle"
  | "listMedal"
  | "listFlag";

export type ListTypes = "list" | "smartlist";

export type ListVisualizations = "list" | "kanban" | "calendar" | "gantt";

export type ListObject = {
  id: string;
  model: "list";
  name: string;
  archivedAt: string | null;
  archivedBy: string | null;
  description: string;
  visualization: ListVisualizations;
  key: string;
  type: ListTypes;
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
  appearance?: {
    hue: number | null;
    iconUrl: string;
  };
  visualization?: string;
};
