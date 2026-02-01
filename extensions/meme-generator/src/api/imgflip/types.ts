// https://imgflip.com/api
export interface ImgflipErrorResponse {
  success: false;
  error_message: string;
}

export type ImgflipGetMemesResponse =
  | {
      success: true;
      data: {
        memes: {
          id: string;
          name: string;
          url: string;
          width: number;
          height: number;
          box_count: number;
        }[];
      };
    }
  | ImgflipErrorResponse;

export interface ImgflipCaptionImageBox {
  text: string;
  x?: string;
  y?: string;
  width?: number;
  height?: number;
  color?: string;
  outline_color?: string;
}

export type ImgflipCaptionImageResponse =
  | {
      success: true;
      data: {
        url: string;
        page_url: string;
      };
    }
  | ImgflipErrorResponse;
