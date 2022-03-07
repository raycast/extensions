declare module 'gif-frames' {
  import type {ReadStream} from 'fs';
  import type {Initializer} from 'multi-integer-range';
  import ContentStream from 'contentstream;'

  export interface DecodeOptions {
    url: string;
    frames: 'all' | Initializer;
    outputType?: 'jpg' | 'jpeg' | 'gif' | 'png' | 'canvas';
    quality?: number;
    cumulative?: boolean;
  }

  export interface FrameData {
    getImage: () => ContentStream;
    frameIndex: number;
    frameInfo: FrameInfo;
  }

  export interface FrameInfo {
    x: number;
    y: number;
    width: number;
    height: number;
    has_local_palette: boolean;
    palette_offset: number;
    palette_size: number;
    data_offset: number;
    data_length: number;
    transparent_index: number;
    interlaced: boolean;
    delay: number;
    disposal: number;
  }

  export default function gifFrames(options: DecodeOptions, callback?: (frameData: FrameData[]) => {}): Promise<FrameData[]>
}
