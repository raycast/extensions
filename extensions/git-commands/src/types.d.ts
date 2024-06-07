export type Alias = {
  /** Name, full command, main command, type and description. */
  name: string;
  command: string;
  main: string;
  type: AliasType;
  description: string;
  fav?: boolean;
  recent?: boolean;
};

/**
 * Type according to the impact the alias may have.
 * - show: The command only shows information, no changes are made.
 * - default: The command can edit, move or delete files.
 * - delete: The command is directly related to the deletion information.
 */
export type AliasType = "show" | "default" | "delete";
