import { getPreferenceValues } from "@raycast/api";
import { PokemonFormType } from "../types";

const { artwork } = getPreferenceValues();

export type SpriteMode = "bw" | "sv" | "official";

export type FormRule = {
  /**
   * Whitelisted Pokémon varieties (mega, regional, etc)
   * per sprite mode.
   *
   * Matches PokéAPI `pokemon.varieties`.
   */
  varieties?: Partial<Record<SpriteMode, string[]>>;

  /**
   * Supported Pokémon forms (form_name)
   * per sprite mode.
   *
   * Matches PokéAPI `pokemonforms`.
   */
  forms?: Partial<Record<SpriteMode, string[]>>;
};

export const FORM_RULES: Record<number, FormRule> = {
  25: {
    varieties: { official: ["pikachu", "pikachu-gmax"] },
  },

  201: {
    forms: { official: [] },
  },

  445: {
    varieties: { official: ["garchomp", "garchomp-mega"] },
  },

  493: {
    forms: { official: [] },
  },

  555: {
    varieties: {
      official: ["darmanitan-standard", "darmanitan-galar-standard"],
    },
  },

  649: {
    forms: { official: [] },
  },

  658: {
    varieties: { official: ["greninja", "greninja-ash", "greninja-mega"] },
  },

  666: {
    forms: {
      official: [
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
  },

  669: {
    forms: { official: ["red"] },
  },

  671: {
    forms: { official: ["red"] },
  },

  676: {
    forms: { official: ["natural", "heart", "star", "diamond"] },
  },

  716: {
    forms: { official: [] },
  },

  718: {
    /**
     * FIXME: using zygarde-50 and zygarde-10-power-construct to represent the forms of Zygarde
     * since the form names in PokéAPI are inconsistent with the official artwork URLs
     */
    varieties: {
      official: [
        "zygarde-50",
        "zygarde-10-power-construct",
        "zygarde-complete",
        "zygarde-mega",
      ],
    },
  },

  744: {
    varieties: { official: ["rockruff"] },
  },

  773: {
    varieties: { official: [] },
  },

  774: {
    varieties: { official: ["minior-red-meteor", "minior-red"] },
  },

  778: {
    varieties: { official: ["mimikyu-disguised"] },
  },

  801: {
    varieties: { official: ["magearna", "magearna-mega"] },
  },

  845: {
    varieties: { official: ["cramorant"] },
  },

  849: {
    varieties: {
      official: [
        "toxtricity-amped",
        "toxtricity-low-key",
        "toxtricity-amped-gmax",
      ],
    },
  },

  869: {
    forms: { official: [] },
  },

  875: {
    varieties: { official: ["eiscue-ice"] },
  },

  893: {
    varieties: { official: ["zarude-dada"] },
  },

  1007: {
    varieties: { official: ["koraidon"] },
  },

  1008: {
    varieties: { official: ["miraidon"] },
  },
};

export const filterPokemonForms = <
  T extends { name: string; pokemonforms: PokemonFormType[] },
>(
  id: number,
  pokemons: T[],
): T[] => {
  if (!pokemons.length) return [];

  const rule = FORM_RULES[id];
  const mode: SpriteMode = artwork;

  // Filter Pokémon varieties (mega, regional, etc)
  const filtered = rule?.varieties?.[mode]?.length
    ? pokemons.filter((p) => rule.varieties![mode]!.includes(p.name))
    : pokemons;

  if (!filtered.length) return [];

  // Resolve forms: expand all by default, override via rule if provided.
  const first = filtered[0];

  const allForms = first.pokemonforms.map((f) => f.form_name);

  const forms = rule?.forms?.[mode] ?? allForms;

  if (!forms.length) return filtered;

  const formMap = new Map(first.pokemonforms.map((f) => [f.form_name, f]));

  // Expand forms only for the first Pokémon, other varieties remain untouched
  return filtered.flatMap((pokemon, index) => {
    if (index !== 0) return pokemon;

    return forms
      .map((formName, formIndex) => {
        const form = formMap.get(formName);
        if (!form) return null;

        return {
          ...pokemon,
          pokemonforms: [
            {
              ...form,
              variety: formIndex !== 0,
            },
          ],
        };
      })
      .filter(Boolean) as T[];
  });
};
