import { Folder } from "./folder";

export type Archive = {
  extract: (toFolder: Folder) => Promise<void>;
};
