import { ALL_TWEAKS } from "../tweaks";
import { CATEGORY_META } from "../types";
import { getAllTweakStates } from "../utils/defaults";
import { formatDefault, formatValue } from "../utils/format";

type Input = {
  /**
   * What the user is looking for, in their own words — for example "hide the dock",
   * "show hidden files", "screenshot format" or "stage manager". Matched against the
   * title, description, tags, category, defaults domain and defaults key of every tweak.
   * Leave empty to list everything.
   */
  query?: string;
};

/**
 * Find the macOS settings this extension can change. Returns each match with its current value,
 * its default, and the id needed to apply or reset it.
 */
export default async function searchTweaks({ query }: Input) {
  const states = await getAllTweakStates(ALL_TWEAKS);
  const terms = (query ?? "")
    .toLowerCase()
    .split(/\s+/)
    .filter((t) => t.length > 1);

  const scored = states
    .map((tweak) => {
      const haystack = [
        tweak.title,
        tweak.description,
        tweak.category,
        CATEGORY_META[tweak.category].title,
        tweak.domain,
        tweak.key,
        ...tweak.tags,
      ]
        .join(" ")
        .toLowerCase();
      const score = terms.filter((t) => haystack.includes(t)).length;
      return { tweak, score };
    })
    .filter(({ score }) => terms.length === 0 || score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 25);

  return scored.map(({ tweak }) => ({
    id: tweak.id,
    title: tweak.title,
    description: tweak.description,
    category: CATEGORY_META[tweak.category].title,
    currentValue: formatValue(tweak),
    defaultValue: formatDefault(tweak),
    isModified: tweak.isModified,
    type: tweak.type,
    options: tweak.options?.map((o) => ({ title: o.title, value: o.value })),
    risk: tweak.risk,
    domain: tweak.domain,
    key: tweak.key,
    requiresRestart: tweak.requiresRestart,
  }));
}
