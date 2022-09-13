export {};

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Bilibili {
    // response
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

    export interface dynamicFeedAllResponse {
      code: number;
      data: {
        items: dynamicVideoFeedAll;
      };
      message: string;
      ttl: number;
    }

    export type dynamicVideoFeedAll = dynmamicVideo[];

    export type dynmamicVideo = {
      id_str: string;
      modules: {
        module_author: {
          face: string;
          jump_url: string;
          mid: number;
          name: string;
          pub_ts: number;
        };
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
      type: string;
    };

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
      stat: {
        danmaku: number;
        view: number;
        coin?: number;
        like: number;
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
  }
}
