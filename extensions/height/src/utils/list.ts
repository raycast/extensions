import { ListObject } from "../types/list";

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
