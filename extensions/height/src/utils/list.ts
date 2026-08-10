import { Color } from "@raycast/api";

import { ListColor, ListHue, ListObject } from "@/types/list";

export const ListIcons = [
  {
    name: "List",
    value: "list",
    icon: "list-icons/list",
  },
  {
    name: "Circles",
    value: "listCircles",
    icon: "list-icons/list-circles",
  },
  {
    name: "Triangle",
    value: "listTriangle",
    icon: "list-icons/list-triangle",
  },
  {
    name: "Square",
    value: "listSquare",
    icon: "list-icons/list-square",
  },
  {
    name: "Lines",
    value: "listLines",
    icon: "list-icons/list-lines",
  },
  {
    name: "Rectangles",
    value: "listRectangles",
    icon: "list-icons/list-rectangles",
  },
  {
    name: "Circle",
    value: "listCircle",
    icon: "list-icons/list-circle",
  },
  {
    name: "Rocket",
    value: "listRocket",
    icon: "list-icons/list-rocket",
  },
  {
    name: "Mushroom",
    value: "listMushroom",
    icon: "list-icons/list-mushroom",
  },
  {
    name: "Bolt",
    value: "listBolt",
    icon: "list-icons/list-bolt",
  },
  {
    name: "Bug",
    value: "listBug",
    icon: "list-icons/list-bug",
  },
  {
    name: "Flower",
    value: "listFlower",
    icon: "list-icons/list-flower",
  },
  {
    name: "Thumbs Up",
    value: "listThumbsUp",
    icon: "list-icons/list-thumbs-up",
  },
  {
    name: "Target",
    value: "listTarget",
    icon: "list-icons/list-target",
  },
  {
    name: "Sparkle",
    value: "listSparkle",
    icon: "list-icons/list-sparkle",
  },
  {
    name: "Medal",
    value: "listMedal",
    icon: "list-icons/list-medal",
  },
  {
    name: "Flag",
    value: "listFlag",
    icon: "list-icons/list-flag",
  },
] as const;

export const ListColors = [
  {
    name: "Default",
    value: "",
    icon: "list-color",
    tintColor: Color.PrimaryText,
  },
  {
    name: "Tomato",
    value: "0",
    icon: "list-color",
    tintColor: "hsl(0, 100%, 68%)",
  },
  {
    name: "Sandy Brown",
    value: "18",
    icon: "list-color",
    tintColor: "hsl(18, 94%, 68%)",
  },
  {
    name: "Gold",
    value: "42",
    icon: "list-color",
    tintColor: "hsl(42, 82%, 57%)",
  },
  {
    name: "Golden Rod",
    value: "56",
    icon: "list-color",
    tintColor: "hsl(56, 73%, 45%)",
  },
  {
    name: "Yellow Green",
    value: "80",
    icon: "list-color",
    tintColor: "hsl(80, 79%, 43%)",
  },
  {
    name: "Medium Sea Green",
    value: "152",
    icon: "list-color",
    tintColor: "hsl(152, 96%, 38%)",
  },
  {
    name: "Dark Turquoise",
    value: "180",
    icon: "list-color",
    tintColor: "hsl(180, 100%, 39%)",
  },
  {
    name: "Deep Sky Blue",
    value: "198",
    icon: "list-color",
    tintColor: "hsl(198, 100%, 50%)",
  },
  {
    name: "Corn Flower Blue",
    value: "220",
    icon: "list-color",
    tintColor: "hsl(220, 100%, 64%)",
  },
  {
    name: "Medium Slate Blue",
    value: "252",
    icon: "list-color",
    tintColor: "hsl(252, 100%, 67%)",
  },
  {
    name: "Blue Violet",
    value: "270",
    icon: "list-color",
    tintColor: "hsl(270, 100%, 65%)",
  },
  {
    name: "Medium Orchid",
    value: "288",
    icon: "list-color",
    tintColor: "hsl(288, 100%, 62%)",
  },
  {
    name: "Deep Pink",
    value: "320",
    icon: "list-color",
    tintColor: "hsl(320, 100%, 59%)",
  },
] as const;

export const ListTypes = [
  {
    name: "List",
    value: "list",
    icon: "list-icons/list",
  },
  {
    name: "Smart List",
    value: "smartlist",
    icon: "list-icons/list-smart",
  },
] as const;

export const ListVisualizations = [
  {
    name: "Spreadsheet",
    value: "list",
    icon: "list-icons/list",
  },
  {
    name: "Kanban",
    value: "kanban",
    icon: "list-icons/list-kanban",
  },
  {
    name: "Calendar",
    value: "calendar",
    icon: "list-icons/list-calendar",
  },
  {
    name: "Gantt",
    value: "gantt",
    icon: "list-icons/list-gantt",
  },
] as const;

export function getListById(listId: string, lists: ListObject[] | undefined, smartLists: ListObject[] | undefined) {
  return lists?.find((list) => list.id === listId) ?? smartLists?.find((list) => list.id === listId);
}

export function getTintColorFromHue(hue: ListHue | string | number | null | undefined, colors: ListColor) {
  const parsedHue = typeof hue === "number" ? String(hue) : typeof hue === "string" ? hue : "";
  return colors?.find((color) => color.value === parsedHue)?.tintColor;
}
