export * from "./task-cli.type";
export * from "./task.type";
export * from "./task.model";
export * from "./task.guard";

import { Color, Icon } from "@raycast/api";
import { Task } from "./task.model";

export type Attribute = keyof Task;
export type ItemAccessory = {
  icon?:
    | Icon
    | string
    | {
        source: Icon;
        tintColor: Color;
      };
  date?: Date;
  text?: string | { value: string; color: Color };
  tag?: string | { value: string; color: Color };
  tooltip: string;
};
