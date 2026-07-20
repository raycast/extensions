import { ActionType, ShortcutKeyType } from "../types";

export type ToolActionType = "activate" | "left" | "right" | "optLeft" | "optRight" | "show";

export type ToolKeyType =
  | "up"
  | "down"
  | "left"
  | "right"
  | "return"
  | "escape"
  | "a"
  | "b"
  | "c"
  | "d"
  | "e"
  | "f"
  | "g"
  | "h"
  | "i"
  | "j"
  | "k"
  | "l"
  | "m"
  | "n"
  | "o"
  | "p"
  | "q"
  | "r"
  | "s"
  | "t"
  | "u"
  | "v"
  | "w"
  | "x"
  | "y"
  | "z";

// Confirming that types are equivalent
// https://stackoverflow.com/a/73461648
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function assert<T extends never>() {}
type TypeEqualityGuard<A, B> = Exclude<A, B> | Exclude<B, A>;
assert<TypeEqualityGuard<ToolActionType, ActionType>>();
assert<TypeEqualityGuard<ToolKeyType, ShortcutKeyType>>();
