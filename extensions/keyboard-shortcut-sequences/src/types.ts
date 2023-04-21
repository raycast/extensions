export interface Application {
  name: string;
  sequences: Sequence[];
}

export interface Sequence {
  name: string;
  description: string;
  icon: string;
  parent: string;
  shortcuts: Shortcut[];
}

export interface Shortcut {
  keystrokes: string;
  modifiers: string[];
}
