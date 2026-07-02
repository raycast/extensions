import { Color, Icon } from "@raycast/api"

export enum SubjectCollectionType {
  Wish = 1,
  Collect = 2,
  Doing = 3,
  OnHold = 4,
  Dropped = 5,
}

export enum SubjectType {
  Book = 1,
  Anime = 2,
  Music = 3,
  Game = 4,
  Real = 6,
}

export const SubjectTypeName: Record<SubjectType, string> = {
  [SubjectType.Book]: "Book",
  [SubjectType.Anime]: "Anime",
  [SubjectType.Music]: "Music",
  [SubjectType.Game]: "Game",
  [SubjectType.Real]: "Real",
}

export enum EpisodeCollectionType {
  NotCollected = 0,
  Wish = 1,
  Watched = 2,
  Dropped = 3,
}

export const EpisodeCollectionTypeName: Record<EpisodeCollectionType, string> = {
  [EpisodeCollectionType.NotCollected]: "Unwatched",
  [EpisodeCollectionType.Wish]: "Wishlist",
  [EpisodeCollectionType.Watched]: "Watched",
  [EpisodeCollectionType.Dropped]: "Dropped",
}

export enum EpisodeType {
  Main = 0,
  SP = 1,
  OP = 2,
  ED = 3,
  Trailer = 4,
  MAD = 5,
  Other = 6,
}

export const EpisodeTypePrefix: Record<EpisodeType, string> = {
  [EpisodeType.Main]: "EP",
  [EpisodeType.SP]: "SP",
  [EpisodeType.OP]: "OP",
  [EpisodeType.ED]: "ED",
  [EpisodeType.Trailer]: "PV",
  [EpisodeType.MAD]: "MAD",
  [EpisodeType.Other]: "Other",
}

export const SubjectVerb: Record<SubjectType, { wish: string; collect: string; doing: string }> = {
  [SubjectType.Anime]: { wish: "Wishlist", collect: "Watched", doing: "Watching" },
  [SubjectType.Book]: { wish: "Wishlist", collect: "Read", doing: "Reading" },
  [SubjectType.Music]: { wish: "Wishlist", collect: "Listened", doing: "Listening" },
  [SubjectType.Game]: { wish: "Wishlist", collect: "Played", doing: "Playing" },
  [SubjectType.Real]: { wish: "Wishlist", collect: "Watched", doing: "Watching" },
}

export const SubjectCollectionColor: Record<SubjectCollectionType, Color | string> = {
  [SubjectCollectionType.Wish]: Color.Blue,
  [SubjectCollectionType.Collect]: Color.SecondaryText,
  [SubjectCollectionType.Doing]: Color.Green,
  [SubjectCollectionType.OnHold]: "#8E9DAE",
  [SubjectCollectionType.Dropped]: "#B87A7A",
}

export const SubjectCollectionIcon: Record<SubjectCollectionType, Icon> = {
  [SubjectCollectionType.Wish]: Icon.Heart,
  [SubjectCollectionType.Collect]: Icon.Check,
  [SubjectCollectionType.Doing]: Icon.Play,
  [SubjectCollectionType.OnHold]: Icon.Pause,
  [SubjectCollectionType.Dropped]: Icon.Xmark,
}
