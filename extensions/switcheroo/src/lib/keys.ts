// Key names that switcheroo understands, grouped by category

export const MODIFIER_KEYS = [
  "caps_lock",
  "left_shift",
  "right_shift",
  "left_ctrl",
  "right_ctrl",
  "left_option",
  "right_option",
  "left_cmd",
  "right_cmd",
] as const;

export const LETTER_KEYS = [
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

export const ARROW_KEYS = [
  "left_arrow",
  "right_arrow",
  "up_arrow",
  "down_arrow",
] as const;

export const SPECIAL_KEYS = [
  "escape",
  "tab",
  "space",
  "return",
  "delete",
  "forward_delete",
] as const;

export const FUNCTION_KEYS = [
  "f1",
  "f2",
  "f3",
  "f4",
  "f5",
  "f6",
  "f7",
  "f8",
  "f9",
  "f10",
  "f11",
  "f12",
] as const;

export const ALL_KEYS = [
  ...LETTER_KEYS,
  ...ARROW_KEYS,
  ...MODIFIER_KEYS,
  ...SPECIAL_KEYS,
  ...FUNCTION_KEYS,
] as const;

export const MODIFIER_NAMES = ["ctrl", "shift", "option", "cmd"] as const;

export type KeyName = (typeof ALL_KEYS)[number];
export type ModifierName = (typeof MODIFIER_NAMES)[number];
