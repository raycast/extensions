/**
 * Represents a shell alias.
 */
export interface Alias {
  /**
   * The name of the alias.
   */
  name: string;

  /**
   * The command associated with the alias.
   */
  command: string;
}
