export {};

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Bilibili {
    export interface GennerateQRCodeResponse {
      code: number;
      data: {
        url: string;
        qrcode_key: string;
      };
      message: string;
      ttl: number;
    }

    export interface CheckQRCodeStatusResponse {
      code: number;
      message: string;
      data: {
        url: string;
        refresh_token: string;
        timestamp: number;
        code: number;
        message: string;
      };
    }

    export interface LogoutResponse {
      code: number;
      status: boolean;
      ts: number;
      message: string;
      data: {
        redirect: string;
      };
    }

    export interface DynamicFeedAllResponse {
      code: number;
      data: {
        items: DynamicItems;
      };
      message: string;
      ttl: number;
    }

    export type DynamicItem = DynmamicVideo | DynamicPost | DynamicMusic | DynamicLive;
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
            };
          };
        };
      };
      type: "DYNAMIC_TYPE_AV";
    }

    export interface DynamicPost {
      id_str: string;
      modules: {
        module_author: DynamicModuleAuthor;
        module_dynamic: {
          desc: {
            text: string;
          };
        };
        module_stat: DynamicModuleStat;
      };
      type: "DYNAMIC_TYPE_DRAW" | "DYNAMIC_TYPE_WORD" | "DYNAMIC_TYPE_FORWARD";
    }

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
      type: "DYNAMIC_TYPE_MUSIC";
    }

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
      type: "DYNAMIC_TYPE_LIVE_RCMD";
    }

    export interface PopularVideosResponse {
      code: number;
      message: string;
      ttl: number;
      data: {
        list: Video[];
        no_more: boolean;
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

    export interface RcmdVideosResponse {
      code: number;
      data: {
        item: Video[];
      };
      message: string;
      ttl: number;
    }

    export interface PopularSeriesListResponse {
      code: number;
      data: {
        list: PopularSeries[];
      };
      message: string;
      ttl: number;
    }

    export type PopularSeries = {
      name: string;
      number: number;
      status: number;
      subject: string;
    };

    export interface PopularSeriesVideosResponse {
      code: number;
      message: string;
      data: {
        list: Video[];
      };
      ttl: number;
    }
  }
}
