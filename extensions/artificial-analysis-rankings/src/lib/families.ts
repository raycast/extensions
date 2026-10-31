import { rankModels, type Model, type RankedModel } from "./models";

function configurationQualifier(value: string): boolean {
  const text = value.trim();
  return (
    /^(?:(?:reasoning|thinking)(?:[ -](?:effort|level))?[\s:=-]*)?(?:minimal|none|low|medium|high|xhigh|extra[ -]high|max|adaptive|default)(?:[ -]+(?:reasoning|thinking))?$/i.test(
      text,
    ) ||
    /^(?:(?:with|without)\s+)?(?:[\w .-]+\s+)?fallback$/i.test(text) ||
    /^(?:reasoning|thinking|non[ -]reasoning|non[ -]thinking)(?:\s+(?:on|off|enabled|disabled))?$/i.test(text) ||
    /^(?:reasoning|thinking)(?:\s+budget)?[\s:=-]+\d+[km]?(?:\s+tokens?)?$/i.test(text)
  );
}

/** Splits trailing configuration qualifiers, such as "(High)", from the model family name. */
export function splitModelName(name: string): { family: string; qualifiers: string[] } {
  let family = name.trim();
  const groups: string[][] = [];
  for (;;) {
    const suffix = /^(.*?)\s*\(([^()]*)\)$/.exec(family);
    if (!suffix || !suffix[1].trim()) break;
    const parts = suffix[2].split(/[,;]/);
    if (!parts.every(configurationQualifier)) break;
    groups.unshift(parts.map((part) => part.trim()));
    family = suffix[1].trim();
  }
  return { family, qualifiers: groups.flat() };
}

export function familyName(name: string): string {
  return splitModelName(name).family;
}

/** The configuration qualifiers removed by {@link familyName}, e.g. "High · No Fallback". */
export function configurationLabel(name: string): string {
  return splitModelName(name).qualifiers.join(" · ");
}

export function familyKey(model: Model): string {
  return `${model.creatorId}:${familyName(model.name).toLocaleLowerCase("en").replace(/\s+/g, " ")}`;
}

export function distinctModelRankings(models: Model[]): RankedModel[] {
  const seen = new Set<string>();
  const best = rankModels(models).filter((model) => {
    const key = familyKey(model);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
  return rankModels(best).map((model) => ({ ...model, rankScope: "families" }));
}
