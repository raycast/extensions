import aliases from "./git-aliases.json";

export interface GitAlias {
  alias: string;
  command: string;
}

export const gitAliases = aliases satisfies GitAlias[];

export function getGitAliasSearchText({ alias, command }: GitAlias): string {
  return `${alias} ${command}`.toLowerCase();
}
