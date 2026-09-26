import { Detail, getPreferenceValues } from "@raycast/api";
import { Name, PokemonType, Type } from "../types";

type SpriteMode = "bw" | "sv" | "go" | "official";

type PokemonFormRef = {
  form_name?: string;
  pokemon_id?: number;
  idx?: number;
  variety?: boolean;
};

const { artwork, shiny } = getPreferenceValues();

export const nationalDexNumber = (id: number) => {
  return `#${id.toString().padStart(4, "0")}`;
};

const getImageId = (id: number, form?: PokemonFormRef): string => {
  // Use the form's specific pokemon_id if available, otherwise fallback to the dex id
  const targetId = form?.pokemon_id ?? id;

  switch (artwork) {
    case "official": {
      if (!shiny) {
        const paddedId = id.toString().padStart(3, "0");
        // If it's a specific form index > 0, append the suffix (e.g., 003_f2)
        return form?.idx ? `${paddedId}_f${form.idx + 1}` : paddedId;
      }
      break;
    }

    case "sv":
    case "go": {
      // If it's the base form (idx === 0) or has no form name, just use the dex id
      if (!form?.form_name || form.idx === 0) {
        return id.toString();
      }
      return `${id}-${form.form_name}`;
    }
  }

  // Default fallback (e.g., standard sprites, or official-shiny)
  return form?.variety && form.form_name
    ? `${targetId}-${form.form_name}`
    : targetId.toString();
};

const getBlackWhiteSprite = (id: number, form?: PokemonFormRef) => {
  const name =
    form?.form_name === "female" ? `female/${id}` : getImageId(id, form);

  return shiny
    ? `https://raw.githubusercontent.com/PokeAPI/sprites/refs/heads/master/sprites/pokemon/shiny/${name}.png`
    : `https://raw.githubusercontent.com/PokeAPI/sprites/refs/heads/master/sprites/pokemon/${name}.png`;
};

const getPokedexAssets = (id: number, form?: PokemonFormRef) => {
  const name = getImageId(id, form);

  const folder = artwork === "sv" ? "scarlet_violet" : "go";

  return shiny
    ? `https://raw.githubusercontent.com/anhthang/pokedex-assets/refs/heads/main/assets/${folder}/shiny/${name}.png`
    : `https://raw.githubusercontent.com/anhthang/pokedex-assets/refs/heads/main/assets/${folder}/${name}.png`;
};

const getOfficialArtwork = (id: number, form?: PokemonFormRef) => {
  const name = getImageId(id, form);

  return shiny
    ? `https://raw.githubusercontent.com/PokeAPI/sprites/refs/heads/master/sprites/pokemon/other/official-artwork/shiny/${name}.png`
    : // Use the "full" artwork URL instead of "detail" because the detail endpoint has incorrect images for some Pokémon (e.g. #676).
      `https://www.pokemon.com/static-assets/content-assets/cms2/img/pokedex/full/${name}.png`;
};

export const getPokemonImage = (id: number, form?: PokemonFormRef) => {
  switch (artwork) {
    case "bw":
      return getBlackWhiteSprite(id, form);
    case "sv":
    case "go":
      return getPokedexAssets(id, form);
    case "official":
    default:
      return getOfficialArtwork(id, form);
  }
};

const spriteSize: Record<SpriteMode, number> = {
  bw: 96,
  sv: 128,
  go: 144,
  official: 144,
};

const getSpriteSize = (mode: SpriteMode) => spriteSize[mode];

export const getPokemonImageTag = (id: number, form?: PokemonFormRef) => {
  const src = getPokemonImage(id, form);
  const width = getSpriteSize(artwork);

  return `<img src="${src}" alt="${id}" width="${width}" height="${width}" />`;
};

export const typeColor: Record<string, string> = {
  normal: "#949495",
  fire: "#e56c3e",
  water: "#5185c5",
  electric: "#f6d851",
  grass: "#66a945",
  ice: "#6dc8eb",
  fighting: "#e09c40",
  poison: "#735198",
  ground: "#9c7743",
  flying: "#a2c3e7",
  psychic: "#dd6b7b",
  bug: "#9fa244",
  rock: "#bfb889",
  ghost: "#684870",
  dragon: "#535ca8",
  dark: "#4c4948",
  steel: "#69a9c7",
  fairy: "#dab4d4",
};

export const getLocalizedName = (
  names: Name[] | undefined,
  fallbackName: string,
) => {
  return names?.[0]?.name || fallbackName;
};

export const calculateEffectiveness = (
  types: PokemonType[],
  allTypes: Type[],
): Record<string, Detail.Metadata.TagList.Item.Props[]> => {
  const effectivenessMap = new Map<string, number>();
  const typeNameMap = new Map<string, string>();

  allTypes.forEach((attacker) => {
    let factor = 1;
    types.forEach((pType) => {
      const efficacy = attacker.typeefficacies.find(
        (eff) => eff.target_type_id === pType.type.id,
      );
      if (efficacy) {
        factor = (factor * efficacy.damage_factor) / 100;
      }
    });

    if (factor !== 1) {
      const relationName = attacker.name;
      effectivenessMap.set(relationName, factor);
      typeNameMap.set(
        relationName,
        getLocalizedName(attacker.typenames, attacker.name),
      );
    }
  });

  const normal: Detail.Metadata.TagList.Item.Props[] = [];
  const weak: Detail.Metadata.TagList.Item.Props[] = [];
  const immune: Detail.Metadata.TagList.Item.Props[] = [];
  const resistant: Detail.Metadata.TagList.Item.Props[] = [];

  effectivenessMap.forEach((factor, type) => {
    if (factor > 1) {
      weak.push({
        text: `${factor}x ${typeNameMap.get(type)}`,
        color: typeColor[type],
        icon: `types/${type}.svg`,
      });
    } else if (factor < 1 && factor > 0) {
      resistant.push({
        text: `${factor}x ${typeNameMap.get(type)}`,
        color: typeColor[type],
        icon: `types/${type}.svg`,
      });
    } else if (factor === 0) {
      immune.push({
        text: `${typeNameMap.get(type)}`,
        color: typeColor[type],
        icon: `types/${type}.svg`,
      });
    }
  });

  return { normal, weak, immune, resistant };
};

export const calculateStrengths = (
  types: PokemonType[],
  allTypes: Type[],
): Record<string, Detail.Metadata.TagList.Item.Props[]> => {
  const effectivenessMap = new Map<string, number>();
  const typeNameMap = new Map<string, string>();

  // Iterate over all possible types, treating them as the "defender"
  allTypes.forEach((defender) => {
    let maxDamageFactor = 0; // Track the best multiplier we can achieve

    types.forEach((pType) => {
      // Find the full Type object for our Pokémon's attacking type
      const attacker = allTypes.find(
        (t) => t.name === pType.type.name || t.id === pType.type.id,
      );

      let damageFactor = 1; // Default to neutral damage (1x)

      if (attacker) {
        // Find how this attacking type affects the current defender
        const efficacy = attacker.typeefficacies.find(
          (eff) => eff.target_type_id === defender.id,
        );

        if (efficacy) {
          damageFactor = efficacy.damage_factor / 100;
        }
      }

      // Offensive coverage takes the best possible multiplier among its STAB types
      if (damageFactor > maxDamageFactor) {
        maxDamageFactor = damageFactor;
      }
    });

    // Only track non-neutral matchups for the final output
    if (maxDamageFactor !== 1 && types.length > 0) {
      effectivenessMap.set(defender.name, maxDamageFactor);
      typeNameMap.set(
        defender.name,
        getLocalizedName(defender.typenames, defender.name),
      );
    }
  });

  const normal: Detail.Metadata.TagList.Item.Props[] = [];
  const superEffective: Detail.Metadata.TagList.Item.Props[] = [];
  const notVeryEffective: Detail.Metadata.TagList.Item.Props[] = [];
  const noEffect: Detail.Metadata.TagList.Item.Props[] = [];

  effectivenessMap.forEach((factor, type) => {
    if (factor > 1) {
      superEffective.push({
        text: `${factor}x ${typeNameMap.get(type)}`,
        color: typeColor[type],
        icon: `types/${type}.svg`,
      });
    } else if (factor < 1 && factor > 0) {
      notVeryEffective.push({
        text: `${factor}x ${typeNameMap.get(type)}`,
        color: typeColor[type],
        icon: `types/${type}.svg`,
      });
    } else if (factor === 0) {
      noEffect.push({
        text: `${typeNameMap.get(type)}`,
        color: typeColor[type],
        icon: `types/${type}.svg`,
      });
    }
  });

  return { normal, superEffective, notVeryEffective, noEffect };
};

export const localeName = (
  pokemon: { localization: Record<string, string>; name: string },
  language: string | number,
) => {
  return pokemon.localization && pokemon.localization[language]
    ? pokemon.localization[language]
    : pokemon.name;
};

export const fixFlavorText = (raw?: string) => {
  return raw?.split("\n").join(" ").split("").join(" ") || "";
};

export const fixItemEffectText = (raw: string) => {
  return raw
    .replaceAll("\n:", ":\n")
    .replaceAll("\n\n", "\n")
    .replaceAll("    ", "");
};
