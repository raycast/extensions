import { Image } from "node-webpmux";

const DEFAULT_BG_COLOR: [number, number, number, number] = [0, 0, 0, 255];

type AnimatedWebpOptions = {
  width: number;
  height: number;
  frameDelayMs: number;
  frames: Buffer[];
  loops?: number;
  bgColor?: [number, number, number, number];
};

export async function encodeAnimatedWebp(
  options: AnimatedWebpOptions
): Promise<Buffer> {
  const { width, height, frameDelayMs, frames, loops, bgColor } = options;
  const webpFrames = await Promise.all(
    frames.map((buffer) =>
      Image.generateFrame({
        buffer,
        x: 0,
        y: 0,
        delay: frameDelayMs,
        blend: true,
        dispose: false,
      })
    )
  );

  return Image.save(null, {
    width,
    height,
    loops: loops ?? 0,
    bgColor: bgColor ?? DEFAULT_BG_COLOR,
    frames: webpFrames,
  });
}
