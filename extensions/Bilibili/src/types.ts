export {};

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Bilibili {
    export interface BaseResponse {
      code: number;
      message: string;
      ttl: number;
      data: object;
    }

    export interface GennerateQRCodeResponse extends Omit<BaseResponse, "data"> {
      data: {
        url: string;
        qrcode_key: string;
      };
    }

    export interface CheckQRCodeStatusResponse extends Omit<BaseResponse, "data"> {
      data: {
        url: string;
        refresh_token: string;
        timestamp: number;
        code: number;
        message: string;
      };
    }

    export interface LogoutResponse extends Omit<BaseResponse & { status: boolean }, "data"> {
      data: {
        redirect: string;
      };
    }

    export interface DynamicFeedAllResponse extends Omit<BaseResponse, "data"> {
      data: {
        items: DynamicItems;
      };
    }

    export type DynamicItem = DynmamicVideo | DynamicPost | DynamicMusic | DynamicLive;
    export type DynamicType = DynmamicVideoType | DynamicPostType | DynamicMusicType | DynamicLiveType;
    export type DynamicItems = DynamicItem[];

    export type DynamicModuleAuthor = {
      face: string;
      jump_url: string;
      mid: number;
      name: string;
      pub_ts: number;
    };

    export type DynamicModuleStat = {
      comment: {
        count: number;
      };
      forward: {
        count: number;
      };
      like: {
        count: number;
      };
    };

    type DynmamicVideoType = "DYNAMIC_TYPE_AV";
    export interface DynmamicVideo {
      id_str: string;
      modules: {
        module_author: DynamicModuleAuthor;
        module_dynamic: {
          type: string;
          major: {
            archive: {
              aid: string;
              badge: {
                bg_color: string;
                text: string;
              };
              bvid: string;
              cover: string;
              desc: string;
              duration_text: string;
              jump_url: string;
              stat: {
                danmaku: string;
                play: string;
              };
              title: string;
              type: number;
              last_play_time?: number;
            };
          };
        };
      };
      type: DynmamicVideoType;
    }

    type DynamicPostType = "DYNAMIC_TYPE_DRAW" | "DYNAMIC_TYPE_WORD" | "DYNAMIC_TYPE_FORWARD";
    export interface DynamicPost {
      id_str: string;
      modules: {
        module_author: DynamicModuleAuthor;
        module_dynamic: {
          desc?: {
            text: string;
          };
        };
        module_stat: DynamicModuleStat;
      };
      type: DynamicPostType;
    }

    type DynamicMusicType = "DYNAMIC_TYPE_MUSIC";
    export interface DynamicMusic {
      id_str: string;
      modules: {
        module_author: DynamicModuleAuthor;
        module_dynamic: {
          major: {
            music: {
              cover: string;
              id: number;
              jump_url: string;
              title: string;
            };
          };
          desc: {
            text: string;
          };
        };
        module_stat: DynamicModuleStat;
      };
      type: DynamicMusicType;
    }

    type DynamicLiveType = "DYNAMIC_TYPE_LIVE_RCMD";
    export interface DynamicLive {
      id_str: string;
      modules: {
        module_author: DynamicModuleAuthor;
        module_dynamic: {
          major: {
            live_rcmd: {
              content: string;
            };
          };
        };
        module_stat: DynamicModuleStat;
      };
      type: DynamicLiveType;
    }

    export interface PopularVideosResponse extends Omit<BaseResponse, "data"> {
      data: {
        list: Video[];
        no_more: boolean;
      };
    }

    export type SearchVideoResult = Omit<Video, "uri"> & {
      arcurl: string;
      like: number;
      danmaku: number;
      play: number;
      duration: string;
      mid: number;
      author: string;
      upic: string;
    };

    export type SearchResult = {
      data: Array<SearchVideoResult>;
      result_type: "video";
    };

    export interface SearchVideosResponse extends Omit<BaseResponse, "data"> {
      data: {
        result: Array<SearchResult>;
      };
    }

    export type Uploader = {
      mid: number;
      name: string;
      face: string;
    };

    export type Video = {
      uri: string;
      aid: number;
      cid: number;
      bvid: string;
      pic: string;
      title: string;
      pubdate: number;
      desc: string;
      duration: number;
      owner: Uploader;
      short_link_v2: string;
      stat: {
        danmaku?: number;
        view?: number;
        coin?: number;
        like?: number;
      };
      rcmd_reason: {
        content: string;
      };
      short_link: string;
    };

    export interface RcmdVideosResponse extends Omit<BaseResponse, "data"> {
      data: {
        item: Video[];
      };
    }

    export interface PopularSeriesListResponse extends Omit<BaseResponse, "data"> {
      data: {
        list: PopularSeries[];
      };
    }

    export type PopularSeries = {
      name: string;
      number: number;
      status: number;
      subject: string;
    };

    export interface PopularSeriesVideosResponse extends Omit<BaseResponse, "data"> {
      data: {
        list: Video[];
      };
    }

    export interface PlayUrlResponse extends Omit<BaseResponse, "data"> {
      data: VideoURLData;
    }

    export interface VideoURLData {
      from: string;
      result: string;
      message: string;
      quality: number;
      format: string;
      timelength: number;
      accept_format: string;
      accept_description: string[];
      accept_quality: number[];
      video_codecid: number;
      seek_param: string;
      seek_type: string;
      durl: Durl[];
      support_formats: SupportFormat[];
      high_format: any;
      last_play_time: number;
      last_play_cid: number;
    }

    export interface Durl {
      order: number;
      length: number;
      size: number;
      ahead: string;
      vhead: string;
      url: string;
      backup_url: string[];
    }

    export interface SupportFormat {
      quality: number;
      format: string;
      new_description: string;
      display_desc: string;
      superscript: string;
      codecs: any;
    }

    export interface VideoInfoResponse extends Omit<BaseResponse, "data"> {
      data: Video;
    }

    interface OutlinePart {
      timestamp: number;
      content: string;
    }

    interface Outline {
      title: string;
      part_outline: OutlinePart[];
      timestamp: number;
    }

    interface ModelResult {
      result_type: number;
      summary: string;
      outline: Outline[];
    }

    export interface VideoConclusionResponseData {
      code: number;
      dislike_num: number;
      like_num: number;
      model_result: ModelResult;
    }

    export interface VideoConclusionResponse extends Omit<BaseResponse, "data"> {
      data: VideoConclusionResponseData;
    }

    interface CidInfo {
      cid: number;
    }

    export interface BvidGetCidResponse extends Omit<BaseResponse, "data"> {
      data: CidInfo[];
    }
  }
}
