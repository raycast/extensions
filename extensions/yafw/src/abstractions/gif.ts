export type Gif = {
  encode: (options?: {
    width?: number;
    height?: number;
    /** Output frame rate. When omitted, the source frame rate is preserved. */
    fps?: number;
    /** 1-100. Maps to the number of colors in the generated palette. When omitted, a full palette is used. */
    quality?: number;
    /** Playback speed multiplier (e.g. 0.5, 1, 2). When omitted or 1, speed is unchanged. */
    speed?: number;
    /** Whether the GIF loops forever or plays once. When omitted, ffmpeg's default (loop forever) is used. */
    loop?: "forever" | "once";
  }) => Promise<void>;
};
