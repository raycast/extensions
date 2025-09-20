import { useSQL } from "@raycast/utils";

interface UseNodeOptions {
  path: string;
  rid: string;
}

export function useNode(options: UseNodeOptions) {
  const { data, ...rest } = useSQL<{ count: number }>(
    options.path,
    `SELECT COUNT(*) as count
     FROM routing
     WHERE repo = "rad:${options.rid}"`,
    { permissionPriming: "This is required to read your Radicle databases." },
  );

  return { data: data && data[0], ...rest };
}
