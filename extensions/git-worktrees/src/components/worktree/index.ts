import { Item } from "./item";
import { List } from "./list";

import type { Worktree as TWorktree } from "#/config/types";

export const Worktree = {
  List: List,
  Item: Item,
};

export type Worktree = TWorktree;
