import { Color } from "@raycast/api";
export interface PilePost {
  content: string;
  data: PileDataI;
  excerpt?: string;
}

export interface PileDataI {
  title: string;
  createdAt: string;
  updatedAt: string;
  highlight: string | null;
  highlightColor: string | null;
  tags: string[];
  replies: string[];
  attachments: string[];
  isReply: boolean;
  isAI: boolean;
}

export interface PileSettings {
  name: string;
  path: string;
  theme: "light" | "dark";
}

export type NoteI = [string, PileDataI];

export type PostHightlights = "Highlight" | "Do later" | "New idea" | null;

export const PostHighlights: Array<{
  highlight: PostHightlights;
  highlightColor: string;
  raycastColor: Color | "transparent";
}> = [
  {
    highlight: null,
    highlightColor: "transparent",
    raycastColor: "transparent",
  },
  {
    highlight: "Highlight",
    highlightColor: "#FF703A",
    raycastColor: Color.Orange,
  },
  {
    highlight: "Do later",
    highlightColor: "#4de64d",
    raycastColor: Color.Green,
  },
  {
    highlight: "New idea",
    highlightColor: "#017AFF",
    raycastColor: Color.Blue,
  },
];

export const PostHighlightsColors: Array<{ highlight: PostHightlights; highlightColor: string }> = [
  {
    highlight: "Highlight",
    highlightColor: "#FF703A",
  },
  {
    highlight: "Do later",
    highlightColor: "#4de64d",
  },
  {
    highlight: "New idea",
    highlightColor: "#017AFF",
  },
];

export interface HighlightI {
  highlight: PostHightlights;
  highlightColor: string;
  raycastColor: Color | "transparent";
}
