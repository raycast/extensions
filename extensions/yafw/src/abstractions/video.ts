export type Video = {
  encode: (options?: {
    preset?: "smallest-size" | "optimal" | "best-quality";
    width?: number;
    height?: number;
    format?: "mp4" | "webm" | "mov";
  }) => Promise<void>;

  stabilize: () => Promise<void>;
};
