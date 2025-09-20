export type Alias = {
  /** Name, full command, main command, type and description. */
  name: string;
  command: string;
  main: string;
  type: AliasType;
  description: string;
  pin?: boolean;
  recent?: boolean;
};

/**
 * Type according to the impact the alias may have.
 * - show: Only shows information.
 * - default: Can edit, move or delete.
 * - delete: Related to information deletion.
 */
export type AliasType = "show" | "default" | "delete";

export interface Data {
  aliases: Alias[];
  pins: Alias[];
  recent: Alias[];
}
