import { Color } from "@raycast/api";

export interface Genre {
  id: string;
  name: string;
  domain: string;
  siteName: string;
  icon: string;
  color: Color;
}

export const GENRES: Genre[] = [
  {
    id: "emo",
    name: "Emo",
    domain: "isthisbandemo.com",
    siteName: "Is This Band Emo?",
    icon: "🖤",
    color: Color.Magenta,
  },
  {
    id: "punk",
    name: "Punk",
    domain: "isthisbandpunk.com",
    siteName: "Is This Band Punk?",
    icon: "🧷",
    color: Color.Green,
  },
  {
    id: "metal",
    name: "Metal",
    domain: "isthisbandmetal.com",
    siteName: "Is This Band Metal?",
    icon: "🤘",
    color: Color.Purple,
  },
  {
    id: "hardcore",
    name: "Hardcore",
    domain: "isthisbandhardcore.com",
    siteName: "Is This Band Hardcore?",
    icon: "⚡",
    color: Color.Red,
  },
  {
    id: "indie",
    name: "Indie",
    domain: "isthisbandindie.com",
    siteName: "Is This Band Indie?",
    icon: "🎧",
    color: Color.Blue,
  },
];

export const DEFAULT_GENRE = GENRES[0];

export function getGenre(id: string): Genre {
  return GENRES.find((genre) => genre.id === id) ?? DEFAULT_GENRE;
}
