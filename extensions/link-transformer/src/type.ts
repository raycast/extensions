import { Keyboard } from "@raycast/api";

export type Link = {
  id: string;
  url: string;
  aliases: string[];
};

export type ActionType = {
  id: string;
  name: string;
  code: string;
  shortcut?: Keyboard.Shortcut;
};

export type Data = {
  links: Link[];
  actions: ActionType[];
};
