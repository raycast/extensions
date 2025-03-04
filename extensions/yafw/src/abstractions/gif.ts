export type Gif = {
  encode: (options?: { width?: number; height?: number }) => Promise<void>;
};
