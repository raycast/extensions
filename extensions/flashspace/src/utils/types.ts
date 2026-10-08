/** Workspace representation from FlashSpace CLI */
export interface Workspace {
  name: string;
  display?: string;
}

/** Profile name returned from FlashSpace CLI */
export interface Profile {
  name: string;
}

/** App representation from FlashSpace CLI */
export interface App {
  name: string;
  bundleId?: string;
}

/** Display representation from FlashSpace CLI */
export interface Display {
  name: string;
}

/** Focus direction for the focus command */
export type FocusDirection = "up" | "down" | "left" | "right";

/** Floating app action */
export type FloatingAppAction = "float" | "unfloat" | "toggle";
