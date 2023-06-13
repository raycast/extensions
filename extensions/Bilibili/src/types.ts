export {};

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Bilibili {
    export interface gennerateQRCodeResponse {
      code: number;
      data: {
        url: string;
        qrcode_key: string;
      };
      message: string;
      ttl: number;
    }

    export interface checkQRCodeStatusResponse {
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

    export interface logoutResponse {
      code: number;
      status: boolean;
      ts: number;
      message: string;
      data: {
        redirect: string;
      };
    }

    export interface dynamicFeedAllResponse {
      code: number;
      data: {
        items: dynamicItems;
      };
      message: string;
      ttl: number;
    }

    export type dynamicItems = (dynmamicVideo | dynamicPost | dynamicMusic | dynamicLive)[];

    export type dynamicModuleAuthor = {
      face: string;
      jump_url: string;
      mid: number;
      name: string;
      pub_ts: number;
    };

    export type dynamicModuleStat = {
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

    export interface dynmamicVideo {
      id_str: string;
      modules: {
        module_author: dynamicModuleAuthor;
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

    export interface dynamicPost {
      id_str: string;
      modules: {
        module_author: dynamicModuleAuthor;
        module_dynamic: {
          desc: {
            text: string;
          };
        };
        module_stat: dynamicModuleStat;
      };
      type: "DYNAMIC_TYPE_DRAW" | "DYNAMIC_TYPE_WORD" | "DYNAMIC_TYPE_FORWARD";
    }

    export interface dynamicMusic {
      id_str: string;
      modules: {
        module_author: dynamicModuleAuthor;
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
        module_stat: dynamicModuleStat;
      };
      type: "DYNAMIC_TYPE_MUSIC";
    }

    export interface dynamicLive {
      id_str: string;
      modules: {
        module_author: dynamicModuleAuthor;
        module_dynamic: {
          major: {
            live_rcmd: {
              content: string;
            };
          };
        };
        module_stat: dynamicModuleStat;
      };
      type: "DYNAMIC_TYPE_LIVE_RCMD";
    }

    export interface popularVideosResponse {
      code: number;
      message: string;
      ttl: number;
      data: {
        list: video[];
        no_more: boolean;
      };
    }

    export type uploader = {
      mid: number;
      name: string;
      face: string;
    };

    export type video = {
      uri: string;
      aid: number;
      bvid: string;
      pic: string;
      title: string;
      pubdate: number;
      desc: string;
      duration: number;
      owner: uploader;
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

    export interface rcmdVideosResponse {
      code: number;
      data: {
        item: video[];
      };
      message: string;
      ttl: number;
    }

    export interface popularSeriesListResponse {
      code: number;
      data: {
        list: popularSeries[];
      };
      message: string;
      ttl: number;
    }

    export type popularSeries = {
      name: string;
      number: number;
      status: number;
      subject: string;
    };

    export interface popularSeriesVideosResponse {
      code: number;
      message: string;
      data: {
        list: video[];
      };
      ttl: number;
    }
  }
}
