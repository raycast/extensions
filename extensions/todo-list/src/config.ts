import { Color, Icon, environment, Image, getPreferenceValues } from "@raycast/api";
import { TodoSections, TodoItem } from "./atoms";
export const TODO_FILE = `${environment.supportPath}/todo.json`;
export const DEFAULT_SECTIONS = { pinned: [], todo: [], completed: [] };
type Data = Record<
  keyof TodoSections,
  {
    name: string;
    accessoryIcon?: Image.ImageLike;
  }
>;

export const SECTIONS_DATA: Data = {
  pinned: { name: "Pinned", accessoryIcon: { source: Icon.Pin, tintColor: Color.Blue } },
  todo: { name: "Todo" },
  completed: { name: "Completed" },
};

export const preferences = getPreferenceValues<Preferences>();

export const priorityIcons: Record<Required<TodoItem>["priority"], Image.ImageLike> = {
  1: { source: Icon.Exclamationmark, tintColor: Color.Purple },
  2: { source: Icon.Exclamationmark2, tintColor: Color.Purple },
  3: { source: Icon.Exclamationmark3, tintColor: Color.Purple },
};

export const priorityDescriptions = {
  1: "low",
  2: "mid",
  3: "high",
};

export const priorityShortInputs: Record<string, 1 | 2 | 3> = {
  "!h": 3,
  "!m": 2,
  "!l": 1,
};
