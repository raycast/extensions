import forgeFields from "./forge-fields.json";

type Input = {
  /**
   * Whether to name a site's fields or a server's.
   */
  target: "site" | "server";
};

const TARGETS = ["site", "server"] as const;

type Target = {
  fields: Record<string, string>;
  inForgeOnly: string[];
  onRequest: string[];
  filters: string[];
  sorts: string[];
};

const ASKS: Record<string, string> = {
  site: "These are field names, not values. Pass the ones you want to list-sites in fields. get-site returns every site field it can.",
  server:
    "These are field names, not values. Pass the ones you want to list-servers in fields, or to get-server in include.",
};

export default async function tool({ target }: Input) {
  // An off-enum target would otherwise throw a raw TypeError at the model
  if (!TARGETS.includes(target)) {
    throw new Error(`probe-api describes ${TARGETS.join(" or ")}, not "${target}".`);
  }
  const { fields, inForgeOnly, onRequest, filters, sorts } = forgeFields[target] as Target;
  const describe = (name: string, description: string) => {
    if (inForgeOnly.includes(name))
      return `${description} This extension never returns it; the get tool gives a Forge link instead.`;
    if (onRequest.includes(name)) return `${description} Withheld unless you name it in include.`;
    return description;
  };

  return {
    target,
    fields: Object.fromEntries(Object.entries(fields).map(([name, text]) => [name, describe(name, text)])),
    filters,
    sorts,
    note: ASKS[target],
    ...(filters.length
      ? { filterNote: "Forge can filter on these. Pass one to the list tool. Forge does the work." }
      : {}),
    ...(sorts.length
      ? {
          sortNote:
            target === "site"
              ? "Forge sorts sites only within one server. Pass serverId to list-sites with sort. Add a minus to reverse, like -created_at."
              : "Forge can sort on these. Add a minus to reverse, like -created_at.",
        }
      : {}),
  };
}
