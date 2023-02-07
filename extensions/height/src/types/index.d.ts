const HueArray = Array.from(Array(360).keys()) as const;

export type Hue = (typeof HueArray)[number];

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
