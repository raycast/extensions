import { Icon, Image, Keyboard } from "@raycast/api";

export interface Shortcut {
  icon?: Image.ImageLike;
  title: string;
  key: Keyboard.Shortcut;
}

export const cmdLeft: Shortcut = {
  icon: "prev_page.png",
  title: "Previous Page",
  key: { modifiers: ["cmd"], key: "arrowLeft" },
};

export const cmdRight: Shortcut = {
  icon: "next_page.png",
  title: "Next Page",
  key: { modifiers: ["cmd"], key: "arrowRight" },
};

export const cmdO: Shortcut = {
  icon: Icon.Globe,
  title: "Open in Browser",
  key: { modifiers: ["cmd"], key: "o" },
};

export const cmdD: Shortcut = {
  icon: Icon.Trash,
  title: "Delete",
  key: { modifiers: ["cmd"], key: "d" },
};

export const cmdE: Shortcut = {
  icon: Icon.Text,
  title: "Detail",
  key: { modifiers: ["cmd"], key: "e" },
};

export const cmdEnter: Shortcut = {
  icon: "enter.png",
  title: "Submit",
  key: { modifiers: ["cmd"], key: "enter" },
};
