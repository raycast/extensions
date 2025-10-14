export interface Sequence {
  name: string;
  description: string;
  icon: string;
  shortcuts: Shortcut[];
}

export const specialKeys = {
  Delete: "51",
  ForwardDelete: "117",
  Return: "36",
  Enter: "76",
  Tab: "48",
  Space: "49",
  Escape: "53",
  UpArrow: "126",
  DownArrow: "125",
  LeftArrow: "123",
  RightArrow: "124",
  Home: "115",
  End: "119",
  PageUp: "116",
  PageDown: "121",
  F1: "122",
  F2: "120",
  F3: "99",
  F4: "118",
  F5: "96",
  F6: "97",
  F7: "98",
  F8: "100",
  F9: "101",
  F10: "109",
  F11: "103",
  F12: "111",
  F13: "105",
  F14: "107",
  F15: "113",
  F16: "106",
  F17: "64",
  F18: "79",
  F19: "80",
  F20: "90",
  VolumeUp: "72",
  VolumeDown: "73",
  Mute: "74",
  Help: "114",
  Power: "96",
  Eject: "14",
  CapsLock: "57",
  NumLock: "71",
  BrightnessUp: "113",
  BrightnessDown: "107",
  PrintScreen: "105",
  Insert: "114",
};

export interface Shortcut {
  keystrokes: string;
  modifiers: ("command down" | "control down" | "option down" | "shift down")[];
  specials: (keyof typeof specialKeys)[];
  delay: number | undefined;
}
