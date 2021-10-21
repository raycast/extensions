import { Color, Icon, environment } from "@raycast/api";
export const TODO_FILE = `${environment.supportPath}/todo.json`;
export const DEFAULT_SECTIONS = [[], []];
export const SECTIONS_DATA = [
  { name: "Pinned", accessoryIcon: { source: Icon.Pin, tintColor: Color.Blue } },
  { name: "Todo" },
];
export const SECTIONS = {
  PINNED: 0,
  OTHER: 1,
};
