declare module "node-webpmux" {
  export type WebPFrame = {
    x?: number;
    y?: number;
    delay?: number;
    blend?: boolean;
    dispose?: boolean;
  };

  export type WebPSaveOptions = {
    width: number;
    height: number;
    loops?: number;
    bgColor?: [number, number, number, number];
    frames: WebPFrame[];
  };

  export class Image {
    static generateFrame(options: {
      buffer: Buffer;
      x?: number;
      y?: number;
      delay?: number;
      blend?: boolean;
      dispose?: boolean;
    }): Promise<WebPFrame>;

    static save(path: string | null, options: WebPSaveOptions): Promise<Buffer>;
  }
}
