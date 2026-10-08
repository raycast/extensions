import { homedir } from "os";
import { resolve } from "path";

export const directoryPath = resolve(homedir(), "Library/Application Support/LocalCan");
export const databasePath = resolve(directoryPath, "localcan.db");

export const listQuery = `
  SELECT domain_groups.name as domain_group_name, domains.*
  FROM domain_groups
  JOIN domains ON domain_groups.domain_group = domains.domain_group
  ORDER BY domain_groups.name ASC, domains.type ASC;
`;
