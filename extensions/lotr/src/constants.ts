import { Icon, getPreferenceValues } from "@raycast/api";

export const API_URL = "https://the-one-api.dev/v2/";
export const API_TOKEN = getPreferenceValues<Preferences>().api_token;
export const API_HEADERS = {
  Authorization: `Bearer ${API_TOKEN}`,
  "Content-Type": "application/json",
};

export const MOVIES_WITH_QUOTES = [
  {
    _id: "5cd95395de30eff6ebccde5b",
    name: "The Two Towers",
  },
  {
    _id: "5cd95395de30eff6ebccde5c",
    name: "The Fellowship of the Ring",
  },
  {
    _id: "5cd95395de30eff6ebccde5d",
    name: "The Return of the King",
  },
];

export const WIKI_ICON = "lotr-fandom-wiki.png";
export const DEFAULT_ICON = "the-one-ring.png";
export const CHARACTER_ICONS = [
  { name: "Frodo Baggins", icon: "icons8-frodo-48.png" },
  { name: "Legolas", icon: "icons8-legolas-48.png" },
  { name: "Gandalf", icon: "icons8-gandalf-48.png" },
  { name: "Gollum", icon: "icons8-gollum-48.png" },
  { race: "Orc", icon: "icons8-orc-48.png" },
  { race: "Goblin", icon: "icons8-goblin-48.png" },
  { race: "Dragon", icon: "icons8-dragon-48.png" },
  { race: "Human", icon: Icon.Person },
];
