export interface Sequence {
  name: string;
  description: string;
  icon: string;
  shortcuts: Shortcut[];
}

export interface Shortcut {
  keystrokes: string;
  modifiers: string[];
}
