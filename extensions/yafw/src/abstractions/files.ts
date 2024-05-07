import { File } from "./file";

export type Files = {
  /**
   * Return list of files
   */
  list: (extensions?: string[]) => Promise<File[]>;
};
