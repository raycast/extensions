// https://github.com/imputnet/cobalt/blob/main/docs/api.md#request-body
type CobaltRequest = {
  url: string;
  videoQuality?: "144" | "240" | "360" | "480" | "720" | "1080" | "1440" | "2160" | "max";
  audioFormat?: "best" | "mp3" | "ogg" | "wav" | "opus";
  audioBitrate?: "320" | "256" | "128" | "96" | "64" | "8";
  filenameStyle?: "classic" | "pretty" | "basic" | "nerdy";
  downloadMode?: "auto" | "audio" | "mute";
  youtubeVideoCodec?: "h264" | "av1" | "vp9";
  youtubeDubLang?: string;
  alwaysProxy?: boolean;
  disableMetadata?: boolean;
  tiktokFullAudio?: boolean;
  tiktokH265?: boolean;
  twitterGif?: boolean;
  youtubeHLS?: boolean;
};

// https://github.com/imputnet/cobalt/blob/main/docs/api.md#response
type CobaltResponse =
  | {
      status: "tunnel" | "redirect";
      url: string;
      filename: string;
    }
  | {
      status: "picker";
      picker: {
        type: "photo" | "video" | "gif";
        url: string;
        thumb: string;
      }[];
      audio?: string;
      audioFilename?: string;
    }
  | {
      status: "error";
      error: {
        code: string;
        context?: {
          service: string;
          limit: number;
        };
      };
    };

type FormValues = Pick<CobaltRequest, "url" | "downloadMode" | "youtubeVideoCodec" | "videoQuality" | "audioFormat">;

type HistoryEntry = {
  id: string;
  url: string;
  filename: string;
  downloadPath: string;
  timestamp: number;
  service: string;
  downloadMode: string;
  videoQuality?: string;
  audioFormat?: string;
  status: "completed" | "failed";
  errorMessage?: string;
  thumbnailUrl: string | null;
};

export type { CobaltRequest, CobaltResponse, FormValues, HistoryEntry };
