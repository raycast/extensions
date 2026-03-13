export type Video = {
  encode: (options?: {
    preset?: "smallest-size" | "optimal" | "best-quality";
    width?: number;
    height?: number;
    format?: "mp4" | "webm" | "mov";
  }) => Promise<void>;

  stabilize: () => Promise<void>;

  trim: (options: { startTime: string; endTime?: string; duration?: string }) => Promise<void>;
};
