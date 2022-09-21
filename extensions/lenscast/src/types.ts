export enum PublicationMainFocus {
  Article = "ARTICLE",
  Audio = "AUDIO",
  Embed = "EMBED",
  Image = "IMAGE",
  Link = "LINK",
  TextOnly = "TEXT_ONLY",
  Video = "VIDEO",
}

export type Media = {
  __typename?: "Media";
  altTag?: string;
  cover?: string;
  url: string;
  mimeType?: string;
};

export type MediaSet = {
  original: Media;
};
