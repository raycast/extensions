export type File = {
  /**
   * Return path of the file
   */
  path: () => string;

  /**
   * Return name of the file
   *
   * @example
   * - my-gif.gif -> my-gif
   * - clip.mp4 -> clip
   */
  name: () => string;

  /**
   * Return extension of the file
   *
   * @example
   * - my-gif.gif -> .gif
   * - clip.mp4 -> .mp4
   */
  extension: () => string;

  /**
   * Return next name. For example in system we have `video.mp4` then this method should return `video 1.mp4`
   */
  nextName: (options?: {
    /**
     * If needed to switch extension. Should start with dot e.g. `.gif` or `.mp4`.
     */
    extension?: string;

    /**
     * Which start number of search should be.
     * @default 1
     */
    counter?: number;
  }) => string;

  /**
   * Remove file
   */
  remove: () => Promise<void>;
};
