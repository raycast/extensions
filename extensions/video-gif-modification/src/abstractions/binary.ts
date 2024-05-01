export type Binary = {
  /**
   * Return path to binary
   */
  path: () => Promise<string>;

  /**
   * Validate the hash to make sure the binary is the right one
   */
  isValid: () => Promise<boolean>;

  /**
   * Change the mode of a file to make it executable
   */
  makeExecutable: () => Promise<void>;
};
