import { Color, Icon, environment, Image } from "@raycast/api";
import { TodoSections } from "./atoms";
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
