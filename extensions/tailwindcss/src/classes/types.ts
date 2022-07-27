export enum Titles {
  Breakpoints = "Breakpoints",
  BoxDecorationBreak = "Box Decoration Break",
  Container = "Container",
  BoxSizing = "box-sizing",
  Display = "display",

  Float = "float",
  Clear = "clear",
  Isolation = "isolation",
  ObjectFit = "object-fit",
  ObjectPosition = "object-position",

  Overflow = "overflow",
  Overscroll = "overscroll",

  Position = "position",
  TopRightBottomLeft = "Top / Right / Bottom / Left",
  Visibility = "visibility",
  ZIndex = "z-index",

  GridTemplateColumns = "grid-template-columns",
  GridColumn = "grid-column, start/end",
  GridTemplateRows = "grid-template-rows",
  GridRow = "grid-row, start/end",
  GridAutoFlow = "gird-auto-flow",
  GridAutoColumns = "grid-auto-columns",
  GridAutoRows = "grid-auto-rows",
  Gap = "gap",

  Padding = "padding",
  Margin = "margin",
  SpaceBetween = "space between",

  Opacity = "opacity",
}

export type TailwindConfig = Record<Titles, Record<string, { value: string; description: string }>>;

export const symbols = [
  { key: "auto", v: "auto" },
  { key: "px", v: "1px" },
  { key: "1/2", v: "50%" },
  { key: "1/3", v: "33.333333%" },
  { key: "2/3", v: "66.666667%" },
  { key: "1/4", v: "25%" },
  { key: "2/4", v: "50%" },
  { key: "3/4", v: "75%" },
  { key: "full", v: "100%" },
  { key: "0.5", v: "0.125rem", desc: "2px" },
  { key: "1.5", v: "0.375rem", desc: "6px" },
  { key: "2.5", v: "0.625rem", desc: "10px" },
  { key: "3.5", v: "0.875rem", desc: "14px" },
];

export const spacing = [
  0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 14, 16, 20, 24, 28, 32, 36, 40, 44, 48, 52, 56, 60, 64, 72, 80, 96,
];

export const columns = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];
export const rows = [1, 2, 3, 4, 5, 6];

export const gradients = [50, 100, 200, 300, 400, 500, 600, 700, 800, 900];
export const colors = ["gray", "red", "yellow", "green", "blue", "indigo", "purple", "pink"]; // extra current black white

export const opacity = [0, 5, 10, 20, 25, 30, 40, 50, 60, 70, 75, 80, 90, 95, 100];
