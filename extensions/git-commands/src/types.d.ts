export type Alias = {
  name: string;
  command: string;
  type: AliasType;
  description: string;
};

/**
 * Type according to the impact the alias may have.
 * - show: The command only shows information, no changes are made.
 * - default: The command can edit, move or delete files.
 * - delete: The command is directly related to the deletion information.
 */
export type AliasType = "show" | "default" | "delete";
