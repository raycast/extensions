import { ReadStream } from "fs";

export type File = {
  /**
   * Return path of the file
   */
  path: () => string;

  /**
   * Return content of the file
   */
  stream: () => Promise<ReadStream>;

  /**
   * Return next name. For example in system we have `video.mp4` then this method should return `video 2.mp4`
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
   * Change content of the file
   */
  write: (content: ReadStream) => Promise<void>;
};
