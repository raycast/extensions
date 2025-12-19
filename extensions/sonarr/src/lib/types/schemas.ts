import { z } from "zod";
import { CoverType } from "./episode";

export const ImageSchema = z.object({
  coverType: z.nativeEnum(CoverType),
  url: z.string(),
  remoteUrl: z.string().optional(),
});

export const RatingsSchema = z.object({
  votes: z.number(),
  value: z.number(),
});

export const SeasonSchema = z.object({
  seasonNumber: z.number(),
  monitored: z.boolean(),
});

export const LanguageSchema = z.object({
  id: z.number(),
  name: z.string(),
});

export const MediaInfoSchema = z.object({
  audioChannels: z.number(),
  audioCodec: z.string(),
  videoCodec: z.string(),
});

export const QualityQualitySchema = z.object({
  id: z.number(),
  name: z.string(),
  source: z.string(),
  resolution: z.number(),
});

export const RevisionSchema = z.object({
  version: z.number(),
  real: z.number(),
  isRepack: z.boolean(),
});

export const EpisodeFileQualitySchema = z.object({
  quality: QualityQualitySchema,
  revision: RevisionSchema,
});

export const EpisodeFileSchema = z.object({
  seriesId: z.number(),
  seasonNumber: z.number(),
  relativePath: z.string(),
  path: z.string(),
  size: z.number(),
  dateAdded: z.string(),
  sceneName: z.string().optional(),
  quality: EpisodeFileQualitySchema,
  language: LanguageSchema,
  mediaInfo: MediaInfoSchema,
  originalFilePath: z.string().optional(),
  qualityCutoffNotMet: z.boolean(),
  id: z.number(),
});

export const SeriesSchema = z.object({
  title: z.string(),
  sortTitle: z.string(),
  seasonCount: z.number(),
  status: z.string(),
  overview: z.string(),
  network: z.string(),
  airTime: z.string(),
  images: z.array(ImageSchema),
  seasons: z.array(SeasonSchema),
  year: z.number(),
  path: z.string(),
  profileId: z.number(),
  languageProfileId: z.number(),
  seasonFolder: z.boolean(),
  monitored: z.boolean(),
  useSceneNumbering: z.boolean(),
  runtime: z.number(),
  tvdbId: z.number(),
  tvRageId: z.number(),
  tvMazeId: z.number(),
  firstAired: z.string(),
  lastInfoSync: z.string(),
  seriesType: z.string(),
  cleanTitle: z.string(),
  imdbId: z.string(),
  titleSlug: z.string(),
  certification: z.string().optional(),
  genres: z.array(z.string()),
  tags: z.array(z.number()),
  added: z.string(),
  ratings: RatingsSchema,
  qualityProfileId: z.number(),
  id: z.number(),
});

export const SingleSeriesSchema = z.object({
  seriesId: z.number(),
  episodeFileId: z.number(),
  seasonNumber: z.number(),
  episodeNumber: z.number(),
  title: z.string(),
  airDate: z.string(),
  airDateUtc: z.string(),
  overview: z.string().optional(),
  episodeFile: EpisodeFileSchema.optional(),
  hasFile: z.boolean(),
  monitored: z.boolean(),
  absoluteEpisodeNumber: z.number().optional(),
  unverifiedSceneNumbering: z.boolean(),
  series: SeriesSchema,
  lastSearchTime: z.string().optional(),
  id: z.number(),
});

export const SeriesStatisticsSchema = z.object({
  seasonCount: z.number(),
  episodeFileCount: z.number(),
  episodeCount: z.number(),
  totalEpisodeCount: z.number(),
  sizeOnDisk: z.number(),
  percentOfEpisodes: z.number(),
});

export const SeriesLookupSchema = z
  .object({
    title: z.string(),
    sortTitle: z.string(),
    status: z.string(),
    overview: z.string(),
    network: z.string().optional(),
    images: z.array(ImageSchema),
    remotePoster: z.string().optional(),
    seasons: z.array(SeasonSchema),
    year: z.number(),
    tvdbId: z.number(),
    tvRageId: z.number().optional(),
    tvMazeId: z.number().optional(),
    imdbId: z.string().optional(),
    titleSlug: z.string(),
    certification: z.string().optional(),
    genres: z.array(z.string()),
    tags: z.array(z.number()),
    added: z.string().optional(),
    ratings: RatingsSchema,
    runtime: z.number(),
    seriesType: z.string(),
    cleanTitle: z.string(),
    firstAired: z.string().optional(),
    statistics: SeriesStatisticsSchema.optional(),
  })
  .passthrough();

export const SeriesFullSchema = z
  .object({
    id: z.number(),
    title: z.string(),
    sortTitle: z.string(),
    seasonCount: z.number(),
    status: z.string(),
    overview: z.string(),
    network: z.string().optional(),
    airTime: z.string().optional(),
    images: z.array(ImageSchema),
    seasons: z.array(SeasonSchema),
    year: z.number(),
    path: z.string(),
    profileId: z.number(),
    languageProfileId: z.number(),
    seasonFolder: z.boolean(),
    monitored: z.boolean(),
    useSceneNumbering: z.boolean(),
    runtime: z.number(),
    tvdbId: z.number(),
    tvRageId: z.number(),
    tvMazeId: z.number(),
    firstAired: z.string(),
    lastInfoSync: z.string().optional(),
    seriesType: z.string(),
    cleanTitle: z.string(),
    imdbId: z.string(),
    titleSlug: z.string(),
    certification: z.string().optional(),
    genres: z.array(z.string()),
    tags: z.array(z.number()),
    added: z.string(),
    ratings: RatingsSchema,
    qualityProfileId: z.number(),
    statistics: SeriesStatisticsSchema.optional(),
    ended: z.boolean(),
  })
  .passthrough();

export const QueueEpisodeSchema = z.object({
  id: z.number(),
  seriesId: z.number(),
  episodeFileId: z.number(),
  seasonNumber: z.number(),
  episodeNumber: z.number(),
  title: z.string(),
  airDate: z.string(),
  airDateUtc: z.string(),
  overview: z.string().optional(),
  hasFile: z.boolean(),
  monitored: z.boolean(),
  absoluteEpisodeNumber: z.number().optional(),
  unverifiedSceneNumbering: z.boolean(),
});

export const StatusMessageSchema = z.object({
  title: z.string(),
  messages: z.array(z.string()),
});

export const QueueItemSchema = z
  .object({
    seriesId: z.number(),
    episodeId: z.number(),
    language: LanguageSchema,
    quality: EpisodeFileQualitySchema,
    size: z.number(),
    title: z.string(),
    sizeleft: z.number(),
    timeleft: z.string(),
    estimatedCompletionTime: z.string(),
    status: z.string(),
    trackedDownloadStatus: z.string(),
    trackedDownloadState: z.string(),
    statusMessages: z.array(StatusMessageSchema),
    errorMessage: z.string().optional(),
    downloadId: z.string(),
    protocol: z.string(),
    downloadClient: z.string(),
    indexer: z.string(),
    outputPath: z.string(),
    downloadForced: z.boolean(),
    series: SeriesFullSchema.optional(),
    episode: QueueEpisodeSchema.optional(),
    id: z.number(),
  })
  .passthrough();

export const WantedMissingEpisodeSchema = z.object({
  id: z.number(),
  seriesId: z.number(),
  episodeFileId: z.number(),
  seasonNumber: z.number(),
  episodeNumber: z.number(),
  title: z.string(),
  airDate: z.string(),
  airDateUtc: z.string(),
  overview: z.string().optional(),
  episodeFile: EpisodeFileSchema.optional(),
  hasFile: z.boolean(),
  monitored: z.boolean(),
  absoluteEpisodeNumber: z.number().optional(),
  unverifiedSceneNumbering: z.boolean(),
  series: SeriesSchema.optional(),
  lastSearchTime: z.string().optional(),
});

export const WantedMissingResponseSchema = z.object({
  page: z.number(),
  pageSize: z.number(),
  sortKey: z.string(),
  sortDirection: z.string(),
  totalRecords: z.number(),
  records: z.array(WantedMissingEpisodeSchema),
});

export const SystemStatusSchema = z
  .object({
    version: z.string(),
    buildTime: z.string().optional(),
    isDebug: z.boolean().optional(),
    isProduction: z.boolean().optional(),
    isAdmin: z.boolean().optional(),
    isUserInteractive: z.boolean().optional(),
    startupPath: z.string().optional(),
    appData: z.string().optional(),
    osName: z.string().optional(),
    osVersion: z.string().optional(),
    isMonoRuntime: z.boolean().optional(),
    isMono: z.boolean().optional(),
    isLinux: z.boolean().optional(),
    isOsx: z.boolean().optional(),
    isWindows: z.boolean().optional(),
    mode: z.string().optional(),
    branch: z.string().optional(),
    authentication: z.string().optional(),
    sqliteVersion: z.string().optional(),
    migrationVersion: z.number().optional(),
    urlBase: z.string().optional(),
    runtimeVersion: z.string().optional(),
    runtimeName: z.string().optional(),
    startTime: z.string().optional(),
    packageVersion: z.string().optional(),
    packageAuthor: z.string().optional(),
    packageUpdateMechanism: z.string().optional(),
  })
  .passthrough();

export const HealthCheckSchema = z.object({
  source: z.string(),
  type: z.string(),
  message: z.string(),
  wikiUrl: z.string().optional(),
});

export const UnmappedFolderSchema = z.object({
  name: z.string(),
  path: z.string(),
});

export const RootFolderSchema = z.object({
  id: z.number(),
  path: z.string(),
  accessible: z.boolean(),
  freeSpace: z.number(),
  unmappedFolders: z.array(UnmappedFolderSchema),
});

export const QualityDefinitionSchema = z.object({
  id: z.number(),
  name: z.string(),
  source: z.string(),
  resolution: z.number(),
});

export const QualityProfileItemSchema: z.ZodType = z.lazy(() =>
  z.object({
    quality: QualityDefinitionSchema.optional(),
    items: z.array(z.unknown()).optional(),
    allowed: z.boolean(),
    id: z.number().optional(),
    name: z.string().optional(),
  }),
);

export const QualityProfileSchema = z.object({
  id: z.number(),
  name: z.string(),
  upgradeAllowed: z.boolean(),
  cutoff: z.number(),
  items: z.array(QualityProfileItemSchema),
});

export const CommandBodySchema = z.object({
  sendUpdatesToClient: z.boolean().optional(),
  updateScheduledTask: z.boolean().optional(),
  completionMessage: z.string().optional(),
  requiresDiskAccess: z.boolean().optional(),
  isExclusive: z.boolean().optional(),
  isTypeExclusive: z.boolean().optional(),
  name: z.string().optional(),
  lastExecutionTime: z.string().optional(),
  lastStartTime: z.string().optional(),
  trigger: z.string().optional(),
  suppressMessages: z.boolean().optional(),
  seriesId: z.number().optional(),
  seasonNumber: z.number().optional(),
  episodeIds: z.array(z.number()).optional(),
});

export const CommandSchema = z.object({
  name: z.string(),
  commandName: z.string(),
  message: z.string().optional(),
  body: CommandBodySchema,
  priority: z.string(),
  status: z.string(),
  queued: z.string(),
  started: z.string().optional(),
  ended: z.string().optional(),
  duration: z.string().optional(),
  trigger: z.string(),
  stateChangeTime: z.string().optional(),
  sendUpdatesToClient: z.boolean(),
  updateScheduledTask: z.boolean(),
  lastExecutionTime: z.string().optional(),
  id: z.number(),
});
