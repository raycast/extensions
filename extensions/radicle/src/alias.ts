import { useSQL } from "@raycast/utils";

interface UseAliasOptions {
  path: string;
  nids: string[];
}

export function useAlias(options: UseAliasOptions) {
  const { data, ...rest } = useSQL<{ id: string; alias: string }>(
    options.path,
    `SELECT id, alias
     FROM nodes
     WHERE id IN (${options.nids.map((id) => `"${id}"`).join(", ")})`,
    { permissionPriming: "This is required to read your Radicle databases." },
  );

  return { data: data ? data.map((a) => ({ id: a.id, alias: a.alias })) : undefined, ...rest };
}
