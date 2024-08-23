export type Binary = {
  /**
   * Return path to binary
   */
  path: () => string;

  /**
   * Check if binary exists
   */
  exists: () => boolean;

  /**
   * Return combined command with the binary path
   */
  command: (args: string) => string;
};
