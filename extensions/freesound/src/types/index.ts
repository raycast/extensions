export type SearchFilter = {
  /** Sound ID on Freesound. */
  id?: number;
  /** Username of the sound uploader (not tokenized). */
  username?: string;
  /** Date in which the sound was added to Freesound */
  created?: string;
  /** Name given to the sound (tokenized). */
  original_filename?: string;
  /** Textual description given to the sound (tokenized). */
  description?: string;
  /** Tag */
  tag?: string;
  /** Name of the Creative Commons license, one of[“Attribution”, “Attribution NonCommercial”, “Creative Commons 0”]. */
  license?: string;
  /** Whether the sound is a remix of another Freesound sound. */
  is_remix?: boolean;
  /** Whether the sound has remixes in Freesound. */
  was_remixed?: boolean;
  /** Pack name (not tokenized). */
  pack?: string;
  /** Pack name (tokenized). */
  pack_tokenized?: string;
  /** Whether the sound has geotag information. */
  is_geotagged?: boolean;
  /** Original file type. */
  type?: "wav" | "aiff" | "ogg" | "mp3" | "m4a" | "flac";
  /** Duration of sound in seconds. */
  duration?: number;
  /** Encoding bitdepth. */
  bitdepth?: number;
  /** Encoding bitrate. */
  bitrate?: number;
  /** Samplerate. */
  samplerate?: number;
  /** File size in bytes. */
  filesize?: number;
  /** Number of channels in sound (mostly 1 or 2). */
  channels?: number;
  /** 32-byte md5 hash of file */
  md5?: string;
  /** Number of times the sound has been downloaded. */
  num_downloads?: number;
  /** Average rating for the sound in the range [0, 5]. */
  avg_rating?: number;
  /** Number of times the sound has been rated. */
  num_ratings?: number;
  /** Textual content of the comments of a sound (tokenized). The filter is satisfied if sound contains the filter value in at least one of its comments. */
  comment?: string;
  /** Number of times the sound has been commented. */
  num_comments?: number;
};

export type SearchFilterKey = keyof SearchFilter;
export const SEARCH_FILTER_KEYS: SearchFilterKey[] = [
  "id",
  "username",
  "created",
  "original_filename",
  "description",
  "tag",
  "license",
  "is_remix",
  "was_remixed",
  "pack",
  "pack_tokenized",
  "is_geotagged",
  "type",
  "duration",
  "bitdepth",
  "bitrate",
  "samplerate",
  "filesize",
  "channels",
  "md5",
  "num_downloads",
  "avg_rating",
  "num_ratings",
  "comment",
  "num_comments",
];

export enum SearchSort {
  /** Sort by a relevance score returned by our search engine (default). */
  Score = "score",
  /** Sort by the duration of the sounds, longest sounds first. */
  DurationDesc = "duration_desc",
  /** Same as DurationDesc, but shortest sounds first. */
  DurationAsc = "duration_asc",
  /** Sort by the date of when the sound was added. newest sounds first. */
  CreatedDesc = "created_desc",
  /** Same as CreatedDesc, but oldest sounds first. */
  CreatedAsc = "created_asc",
  /** Sort by the number of downloads, most downloaded sounds first. */
  DownloadsDesc = "downloads_desc",
  /** Same as DownloadsDesc, but least downloaded sounds first. */
  DownloadsAsc = "downloads_asc",
  /** Sort by the average rating given to the sounds, highest rated first. */
  RatingDesc = "rating_desc",
  /** Same as RatingDesc, but lowest rated sounds first. */
  RatingAsc = "rating_asc",
}

export type SearchOptions = {
  sort?: SearchSort;
  groupByPack?: boolean;
  filters?: SearchFilter;
};

export type SoundInstanceSimple = {
  /** The sound's unique identifier. */
  id: number;
  /** Name of the sound */
  name: string;
  /** Tags */
  tags: string[];
  /** License */
  license: string;
  /** Username */
  username: string;
};

export type SoundInstance = SoundInstanceSimple & {
  /** The URI for this sound on the Freesound website. */
  url: string;
  /** The description the user gave to the sound. */
  description: string;
  /** Latitude and longitude of the geotag separated by spaces (e.g. “41.0082325664 28.9731252193”, only for sounds that have been geotagged). */
  geotag: string;
  /** The date when the sound was uploaded (e.g. “2014-04-16T20:07:11.145”). */
  created: string;
  /** The type of sound (wav, aif, aiff, mp3, m4a or flac). */
  type: "wav" | "aif" | "aiff" | "mp3" | "m4a" | "flac";
  /** The number of channels. */
  channels: number;
  /** The size of the file in bytes. */
  filesize: number;
  /** The bit rate of the sound in kbps. */
  bitrate: number;
  /** The bit depth of the sound. */
  bitdepth: number;
  /** The duration of the sound in seconds. */
  duration: number;
  /** The samplerate of the sound. */
  samplerate: number;
  /** If the sound is part of a pack, this URI points to that pack’s API resource. */
  pack: string;
  /** The URI for retrieving the original sound. */
  download: string;
  /** The URI for bookmarking the sound. */
  bookmark: string;
  /** Dictionary containing the URIs for mp3 and ogg versions of the sound. */
  previews: {
    "preview-hq-mp3": string;
    "preview-lq-mp3": string;
    "preview-hq-ogg": string;
    "preview-lq-ogg": string;
  };
  /** Dictionary including the URIs for spectrogram and waveform visualizations of the sound. */
  images: {
    waveform_l: string;
    waveform_m: string;
    spectral_l: string;
    spectral_m: string;
  };
  /** The number of times the sound was downloaded. */
  num_downloads: number;
  /** The average rating of the sound. */
  avg_rating: number;
  /** The number of times the sound was rated. */
  num_ratings: number;
  /** The URI for rating the sound. */
  rate: string;
  /** The URI of a paginated list of the comments of the sound. */
  comments: string;
  /** The number of comments. */
  num_comments: number;
  /** The URI to comment the sound. */
  comment: string;
  /** URI pointing to the similarity resource (to get a list of similar sounds). */
  similar_sounds: string;
  /** Dictionary containing requested descriptors information according to the descriptors request parameter. */
  analysis: Record<string, unknown> | null;
  /** URI pointing to the complete analysis results of the sound. */
  analysis_stats: string;
  /** The URI for retrieving a JSON file with analysis information for each frame of the sound. */
  analysis_frames: string;
  /** Dictionary containing the results of the AudioCommons analysis for the given sound. */
  ac_analysis: Record<string, unknown>;
};

export type FieldFilterKey = keyof SoundInstance;
export const SOUND_INSTANCE_FIELDS: FieldFilterKey[] = [
  "id",
  "name",
  "tags",
  "license",
  "username",
  "url",
  "description",
  "geotag",
  "created",
  "type",
  "channels",
  "filesize",
  "bitrate",
  "bitdepth",
  "duration",
  "samplerate",
  "pack",
  "download",
  "bookmark",
  "previews",
  "images",
  "num_downloads",
  "avg_rating",
  "num_ratings",
  "rate",
  "comments",
  "num_comments",
  "comment",
  "similar_sounds",
  "analysis",
  "analysis_stats",
  "analysis_frames",
  "ac_analysis",
];

export type SoundResultExtra = {
  /** Query results are paginated, this parameter indicates what page should be returned. By default page=1. */
  page: number;
  /** Indicates the number of sounds per page to include in the result. By default page_size=15, and the maximum is page_size=150. Note that with bigger page_size, more data will need to be transferred. */
  page_size: number;
  /** Indicates which sound properties should be included in every sound of the response. Sound properties can be any of those listed in Response (sound instance) (plus an additional field score which returns a matching score added by the search engine), and must be separated by commas. For example, if fields=name,score,avg_rating,license, results will include sound name, search engine score in relation the query, average rating and license for every returned sound. Use this parameter to optimize request time by only requesting the information you really need. */
  fields: FieldFilterKey[];
  /** Indicates which sound content-based descriptors should be included in every sound of the response. This parameter will have no effect if analysis property is not included in the fields request parameter. Descriptor names can be any of those listed in available-descriptors, and must be separated by commas. For example, if fields=analysis&descriptors=lowlevel.spectral_centroid,lowlevel.barkbands.mean, the response will include, for every returned sound, all statistics of the spectral centroid descriptor and the mean of the barkbands. Descriptor values are included in the response inside the analysis sound property (see the examples). analysis might be null if no valid descriptor names are found or the analysis data of a particular sound is not available. */
  descriptors: string;
  /** Indicates whether the returned sound content-based descriptors should be normalized or not. normalized=1 will return normalized descriptor values. By default, normalized=0. */
  normalized: number;
};

export type SoundSearchResponse = {
  /** The total number of sounds that match the query. */
  count: number;
  /** The URI for the next page of results. */
  next: string | null;
  /** The URI for the previous page of results. */
  previous: string | null;
  /** An array of sound instances and info */
  results: SoundInstance[];
};

export type User = {
  /** The URI for this users’ profile on the Freesound website. */
  url: string;
  /** The username. */
  username: string;
  /** The ‘about’ text of users’ profile (if indicated). */
  about: string;
  /** The URI of users’ homepage outside Freesound (if indicated). */
  homepage: string;
  /** Dictionary including the URIs for the avatar of the user. The avatar is presented in three sizes Small, Medium and Large, which correspond to the three fields in the dictionary. If user has no avatar, this field is null. */
  avatar: {
    small: string;
    medium: string;
    large: string;
  } | null;
  /** The date when the user joined Freesound (e.g. “2008-08-07T17:39:00”). */
  date_joined: string;
  /** The number of sounds uploaded by the user. */
  num_sounds: number;
  /** The URI for a list of sounds by the user. */
  sounds: string;
  /** The number of packs by the user. */
  num_packs: number;
  /** The URI for a list of packs by the user. */
  packs: string;
  /** The number of forum posts by the user. */
  num_posts: number;
  /** The number of comments that user made in other users’ sounds. */
  num_comments: number;
};
