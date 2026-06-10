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
  /** 未收藏 */
  NotCollected = 0,
  /** 想看 */
  Wish = 1,
  /** 看过 */
  Watched = 2,
  /** 抛弃 */
  Dropped = 3,
}

export const EpisodeCollectionTypeName: Record<EpisodeCollectionType, string> = {
  [EpisodeCollectionType.NotCollected]: "Unwatched",
  [EpisodeCollectionType.Wish]: "Wishlist",
  [EpisodeCollectionType.Watched]: "Watched",
  [EpisodeCollectionType.Dropped]: "Dropped",
}

export enum EpisodeType {
  /** 本篇 */
  Main = 0,
  /** 特别篇 */
  SP = 1,
  /** OP */
  OP = 2,
  /** ED */
  ED = 3,
  /** 预告/宣传/广告 */
  Trailer = 4,
  /** MAD */
  MAD = 5,
  /** 其他 */
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

export interface CollectionTag {
  value: string
  color: Color | string
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

export const getCollectionTag = (
  collectionType: SubjectCollectionType,
  subjectType: SubjectType = SubjectType.Anime
): CollectionTag => {
  const verbs = SubjectVerb[subjectType]
  const color = SubjectCollectionColor[collectionType]

  switch (collectionType) {
    case SubjectCollectionType.Wish:
      return { value: verbs.wish, color }
    case SubjectCollectionType.Collect:
      return { value: verbs.collect, color }
    case SubjectCollectionType.Doing:
      return { value: verbs.doing, color }
    case SubjectCollectionType.OnHold:
      return { value: "On Hold", color }
    case SubjectCollectionType.Dropped:
      return { value: "Dropped", color }
    default:
      return { value: "Unknown", color }
  }
}
