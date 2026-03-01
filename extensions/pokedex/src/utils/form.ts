import { getPreferenceValues } from "@raycast/api";
import { PokemonFormType } from "../types";

const { artwork } = getPreferenceValues();

export type FormRule = {
  /**
   * Allowed alternate form Pokémon names for official artwork only
   * (Mega, Gmax, regional entries, etc).
   */
  allowedNames?: string[];

  /**
   * Supported varieties for official artwork.
   * Pixel mode expands all varieties automatically.
   */
  varieties?: string[];
};

export const FORM_RULES: Record<number, FormRule> = {
  25: {
    allowedNames: ["pikachu", "pikachu-gmax"],
  },

  // Unown: expand all varieties in pixel mode
  201: {
    varieties: [],
  },

  412: {
    varieties: ["plant", "sandy", "trash"],
  },

  421: {
    varieties: ["overcast", "sunshine"],
  },

  422: {
    varieties: ["west", "east"],
  },

  445: {
    allowedNames: ["garchomp", "garchomp-mega"],
  },

  493: {
    varieties: [],
  },

  555: {
    allowedNames: ["darmanitan-standard", "darmanitan-galar-standard"],
  },

  585: {
    varieties: ["spring", "summer", "autumn", "winter"],
  },

  586: {
    varieties: ["spring", "summer", "autumn", "winter"],
  },

  649: {
    varieties: [],
  },

  658: {
    allowedNames: ["greninja", "greninja-ash", "greninja-mega"],
  },

  666: {
    varieties: [
      "meadow",
      "continental",
      "garden",
      "elegant",
      "marine",
      "high-plains",
      "river",
      "fancy",
    ],
  },

  669: {
    varieties: ["red"],
  },

  671: {
    varieties: ["red"],
  },

  676: {
    varieties: ["natural", "heart", "star", "diamond"],
  },

  716: {
    varieties: [],
  },

  718: {
    /**
     * FIXME: using zygarde-50 and zygarde-10-power-construct to represent the forms of Zygarde
     * since the form names in PokéAPI are inconsistent with the official artwork URLs
     */
    allowedNames: [
      "zygarde-50",
      "zygarde-10-power-construct",
      "zygarde-complete",
      "zygarde-mega",
    ],
  },

  744: {
    allowedNames: ["rockruff"],
  },

  // Silvally: expand all varieties in pixel mode
  773: {
    varieties: [],
  },

  774: {
    allowedNames: ["minior-red-meteor", "minior-red"],
  },

  778: {
    allowedNames: ["mimikyu-disguised"],
  },

  801: {
    allowedNames: ["magearna", "magearna-mega"],
  },

  845: {
    allowedNames: ["cramorant"],
  },

  849: {
    allowedNames: [
      "toxtricity-amped",
      "toxtricity-low-key",
      "toxtricity-amped-gmax",
    ],
  },

  869: {
    varieties: [],
  },

  875: {
    allowedNames: ["eiscue-ice"],
  },

  893: {
    allowedNames: ["zarude-dada"],
  },

  1007: {
    allowedNames: ["koraidon"],
  },

  1008: {
    allowedNames: ["miraidon"],
  },
};

const resolveVarieties = (
  rule: FormRule | undefined,
  pokemons: { pokemonforms: PokemonFormType[] }[],
): string[] => {
  if (!rule?.varieties) return [];

  // Pixel mode: always expand all PokéAPI varieties
  if (artwork === "pixel") {
    return pokemons[0]?.pokemonforms.map((f) => f.form_name) ?? [];
  }

  // Official mode: expand only whitelisted varieties
  return rule.varieties;
};

export const filterPokemonForms = <
  T extends { name: string; pokemonforms: PokemonFormType[] },
>(
  id: number,
  pokemons: T[],
): T[] => {
  if (!pokemons.length) return [];

  const rule = FORM_RULES[id];
  if (!rule) return pokemons;

  let filtered = pokemons;

  /**
   * Official artwork only:
   * filter alternate form entries (Mega, Gmax, etc)
   */
  if (artwork === "official" && rule?.allowedNames?.length) {
    filtered = filtered.filter((p) => rule.allowedNames!.includes(p.name));
  }

  /**
   * Expand varieties:
   * - Pixel: expand all automatically
   * - Official: expand only whitelisted varieties
   */
  const varieties = resolveVarieties(rule, filtered);

  if (!varieties.length) return filtered;

  return filtered.flatMap((p, fIdx) => {
    if (fIdx > 0) return p; // only expand the first form entry to avoid duplicates
    return varieties.map((variety, idx) => ({
      ...p,
      pokemonforms: p.pokemonforms
        .filter((f) => f.form_name === variety)
        .map((f) => ({
          ...f,
          variety: idx !== 0,
        })),
    }));
  });
};
