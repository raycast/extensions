export type Folder = {
  /**
   * Path to folder
   */
  path: () => string;

  /**
   * Creates folder if not exists
   */
  createIfNotExists: () => Promise<void>;

  /**
   * Remove folder and it's content
   */
  remove: () => Promise<void>;
};
