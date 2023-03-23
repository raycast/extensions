export enum SearchType {
  All = 'ALL',
  Podcast = 'PODCAST',
  Episode = 'EPISODE',
  User = 'USER',
}

export type SearchResult = {
  [SearchType.Podcast]: Podcast
  [SearchType.Episode]: Episode
  [SearchType.User]: User
  [SearchType.All]: Podcast | Episode | User
}

export enum SyncMode {
  RSS = 'RSS',
  SELF_HOSTING = 'SELF_HOSTING',
  QQ_MUSIC = 'QQ_MUSIC',
}
export type Stats = {
  shareCount: number

  episodeClapCount: number
  episodeCommentCount: number
  episodePlayCount: number
  episodeFavoriteCount: number
  episodeShareCount: number
  episodePickCount: number
}

export enum Status {
  INITIALIZED = 'INITIALIZED',
  NORMAL = 'NORMAL',
  PRIVATE = 'PRIVATE',
  REMOVED = 'REMOVED',
  DELETED = 'DELETED',
}

export type Podcast = {
  id: string
  type: 'PODCAST'
  pid: string
  title: string
  author?: string
  brief?: string
  description?: string
  image?: string
  status: Status
  prUrls: string[]
  syncMode: SyncMode
  subscriptionCount: number
  cacheEpisodeMedia: boolean

  stats: Stats
  episodeCount: number

  primaryGenreName?: string
  genres: string[]
  unsearchableOn: string[]
  latestEpisodePubDate?: Date

  createdAt: string
  categories: {
    id: string
    name: string
  }[]
  remark?: string
  topList?: {
    occurrenceNumberInNewStarTopList: number
  }
  reviewInfo: {
    rejectReason?: string
  }
  hostingInfo?: {
    rss?: {
      feedUrl?: string // enabled与否将体现在字段的存在与否上
    }
  }
  rssInfo?: {
    feedUrl: string
    nextSyncAt: Date
    lastSync?: { at: Date; error?: string }
  }
}

export enum EpStatus {
  INITIALIZED = 'INITIALIZED',
  NORMAL = 'NORMAL',
  REMOVED = 'REMOVED', // 审核下架
  DELETED = 'DELETED',
}

export type Episode = {
  id: string // compatibility
  type: 'EPISODE'
  eid: string
  podcast: Podcast
  title: string
  description?: string
  shownotes?: string
  duration?: number
  image?: { thumbnailUrl?: string }
  enclosure: { url: string }
  pubDate: Date
  status: EpStatus
  removedFromFeed: boolean
  segmentClapCount: { [index: string]: number }
  cacheMedia: boolean
  // cacheStatus?: CacheStatus
  backupMediaUrl?: string
  listedInHotEpisodesTopListAt: string[] // 热榜
  listedInEditorPickAt: string[] // 编辑日推
  listedInSkyrocketEpisodesTopListAt: string[] // 锋芒榜
  listedInNewStarEpisodesTopListAt: string[] // 新星榜
  isPayEpisode: boolean
} & Pick<
  {
    playCount: number
    clapCount: number
    commentCount: number
    podcasterCommentCount: number
    nonPodcasterCommentCount: number
    primaryCommentCount: number
    favoriteCount: number
    shareCount: number
    pickCount: number
    commentLikeCount: number
    heatMap: Record<string, number>
  },
  'playCount' | 'clapCount' | 'commentCount' | 'podcasterCommentCount' | 'nonPodcasterCommentCount'
>

export type User = {
  id: string
  type: 'USER'
  uid: string
  avatar: { picture: { thumbnailUrl?: string } }
  nickname: string
  bio?: string
  gender?: 'MALE' | 'FEMALE' | 'THIRD'
  birth?: Date
  createdAt: Date
  userStats: {
    followingCount: number
    followerCount: number
    subscriptionCount: number
    totalPlayedSeconds: number
  }
}
