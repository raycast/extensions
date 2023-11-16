export interface PilePost {
  content: string;
  data: {
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
  };
}

export interface PileSettings {
  name: string;
  path: string;
  theme: "light" | "dark";
}

export enum PostHightlightsI {
  None = "None",
  Highlight = "Highlight",
  DoLater = "Do later",
  NewIdea = "New idea",
}

export const PostHighlights = [
  {
    highlight: PostHightlightsI.None,
    highlightColor: "transparent",
  },
  {
    highlight: PostHightlightsI.Highlight,
    highlightColor: "#FF703A",
  },
  {
    highlight: PostHightlightsI.DoLater,
    highlightColor: "#4de64d",
  },
  {
    highlight: PostHightlightsI.NewIdea,
    highlightColor: "#017AFF",
  },
];

export interface HighlightI {
  highlight: PostHightlightsI;
  highlightColor: string;
}
