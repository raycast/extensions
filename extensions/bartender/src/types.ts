import { Static, Type } from "@sinclair/typebox";

export type Success<T> = T extends void ? { status: "success" } : { status: "success"; data: T };
type Error = { status: "error"; error: string };
export type Result<T> = Success<T> | Error;

export type MenuBarDetail = {
  name?: string;
  menuBarId: string;
  icon?: { type: "app"; path: string } | { type: "asset"; path: string };
};
export const ActionType = Type.Union([
  Type.Literal("activate"),
  Type.Literal("left"),
  Type.Literal("right"),
  Type.Literal("optLeft"),
  Type.Literal("optRight"),
  Type.Literal("show"),
]);
export type ActionType = Static<typeof ActionType>;
export const VALID_SHORTCUT_KEYS = [
  "up",
  "down",
  "left",
  "right",
  "return",
  "escape",
  "a",
  "b",
  "c",
  "d",
  "e",
  "f",
  "g",
  "h",
  "i",
  "j",
  "k",
  "l",
  "m",
  "n",
  "o",
  "p",
  "q",
  "r",
  "s",
  "t",
  "u",
  "v",
  "w",
  "x",
  "y",
  "z",
] as const;
export type ShortcutKeyType = (typeof VALID_SHORTCUT_KEYS)[number];
