export interface Sequence {
  name: string;
  description: string;
  icon: string;
  shortcuts: Shortcut[];
}

export const specialKeys = {
  // Navigation - Arrow Keys
  UpArrow: "126",
  DownArrow: "125",
  LeftArrow: "123",
  RightArrow: "124",

  // Navigation - Page/Position
  Home: "115",
  End: "119",
  PageUp: "116",
  PageDown: "121",

  // Text Editing
  Delete: "51",
  ForwardDelete: "117",
  Return: "36",
  Enter: "76",
  Tab: "48",
  Space: "49",
  Escape: "53",

  // Function Keys F1-F12
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

  // Media Controls
  VolumeUp: "72",
  VolumeDown: "73",
  Mute: "74",

  // System Controls
  BrightnessUp: "113",
  BrightnessDown: "107",

  // Special Keys
  CapsLock: "57",
};

export interface Shortcut {
  keystrokes: string;
  modifiers: ("command down" | "control down" | "option down" | "shift down" | "fn down")[];
  specials: (keyof typeof specialKeys)[];
  delay: number | undefined;
}
