import { File } from "./file";

export type Files = {
  /**
   * Return list of files
   */
  list: () => Promise<File[]>;
};
