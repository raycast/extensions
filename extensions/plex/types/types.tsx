export interface SectionsApiResponse {
  MediaContainer: {
    size: number;
    allowSync: string;
    title1: string;
    Directory: {
      allowSync: boolean;
      art: string;
      composite: string;
      filters: boolean;
      refreshing: boolean;
      thumb: string;
      key: string;
      type: string;
      title: string;
      agent: string;
      scannedAt: number;
      content: boolean;
      directory: boolean;
      hidden: number;
      language: string;
      Location: {
        id: number;
        path: string;
      }[];
    }[];
  };
}

type Metadata = {
  ratingKey: string;
  key: string;
  guid: string;
  slug: string;
  studio: string;
  type: string;
  title: string;
  contentRating: string;
  summary: string;
  rating: number;
  audienceRating: number;
  year: number;
  tagline: string;
  thumb: string;
  art: string;
  duration: number;
  originallyAvailableAt: string;
  addedAt: number;
  updatedAt: number;
  audienceRatingImage: string;
  chapterSource: string;
  hasPremiumExtras: string;
  hasPremiumPrimaryExtra: string;
  ratingImage: string;
};

type MediaContainer = {
  size: number;
  title1: string;
  title2: string;
  Metadata: Metadata;
};

export type SectionItemsApiResponse = {
  MediaContainer: MediaContainer;
};

export interface SessionApiResponse {
  MediaContainer: {
    size: number;
    Metadata: MetadataItem;
  };
}

type MetadataItem = {
  size: number;
  addedAt: number;
  art: string;
  audienceRating: number;
  audienceRatingImage: string;
  chapterSource: string;
  contentRating: string;
  duration: number;
  guid: string;
  hasPremiumExtras: string;
  hasPremiumPrimaryExtra: string;
  key: string;
  lastViewedAt: number;
  librarySectionID: string;
  librarySectionKey: string;
  librarySectionTitle: string;
  originallyAvailableAt: string;
  rating: number;
  ratingImage: string;
  ratingKey: string;
  sessionKey: string;
  slug: string;
  studio: string;
  summary: string;
  tagline: string;
  thumb: string;
  title: string;
  type: string;
  updatedAt: number;
  viewOffset: number;
  year: number;
  Media: MediaItem;
  User: UserInfo;
  Player: PlayerInfo;
  Session: SessionInfo;
  TranscodeSession: TranscodeSessionInfo;
};

type MediaItem = {
  audioProfile: string;
  id: string;
  videoProfile: string;
  audioChannels: number;
  audioCodec: string;
  container: string;
  duration: number;
  height: number;
  protocol: string;
  videoCodec: string;
  videoFrameRate: string;
  videoResolution: string;
  width: number;
  Part: PartItem;
};

type PartItem = {
  audioProfile: string;
  id: string;
  videoProfile: string;
  container: string;
  duration: number;
  height: number;
  protocol: string;
  width: number;
  decision: string;
  Stream: StreamItem;
};

type StreamItem = {
  bitrate: number;
  bitrateMode: string;
  channels: number;
  codec: string;
  default: boolean;
  displayTitle: string;
  extendedDisplayTitle: string;
  frameRate: number;
  height: number;
  id: string;
  streamType: number;
  decision: string;
  location: string;
};

type UserInfo = {
  id: string;
  thumb: string;
  title: string;
};

type PlayerInfo = {
  address: string;
  device: string;
  machineIdentifier: string;
  model: string;
  platform: string;
  platformVersion: string;
  product: string;
  profile: string;
  state: string;
  title: string;
  version: string;
  local: boolean;
  relayed: boolean;
  secure: boolean;
  userID: number;
};

interface SessionInfo {
  id: string;
  bandwidth: number;
  location: string;
}

interface TranscodeSessionInfo {
  key: string;
  throttled: boolean;
  complete: boolean;
  progress: number;
  size: number;
  speed: number;
  error: boolean;
  duration: number;
  remaining: number;
  context: string;
  sourceVideoCodec: string;
  sourceAudioCodec: string;
  videoDecision: string;
  audioDecision: string;
  subtitleDecision: string;
  protocol: string;
  container: string;
  videoCodec: string;
  audioCodec: string;
  audioChannels: number;
  transcodeHwRequested: boolean;
  timeStamp: number;
  maxOffsetAvailable: number;
  minOffsetAvailable: number;
}
