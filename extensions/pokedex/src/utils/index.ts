import { Detail, getPreferenceValues } from "@raycast/api";
import { PokemonType, TypeChartType } from "../types";

const { artwork, shiny } = getPreferenceValues();

type PokemonFormRef = {
  form_name?: string;
  pokemon_id?: number;
  idx?: number;
  variety?: boolean;
};

export const nationalDexNumber = (id: number) => {
  return `#${id.toString().padStart(4, "0")}`;
};

const getImageId = (id: number, form?: PokemonFormRef) => {
  const pokemonId = form?.pokemon_id || id;

  let name = form?.variety ? `${id}-${form.form_name}` : pokemonId.toString();

  if (artwork === "official" && !shiny) {
    name = form?.idx
      ? `${id.toString().padStart(3, "0")}_f${form.idx + 1}`
      : id.toString().padStart(3, "0");
  }

  return name;
};

const getPixelArtImg = (id: number, form?: PokemonFormRef) => {
  const name = getImageId(id, form);

  return shiny
    ? `https://raw.githubusercontent.com/PokeAPI/sprites/refs/heads/master/sprites/pokemon/shiny/${name}.png`
    : `https://raw.githubusercontent.com/PokeAPI/sprites/refs/heads/master/sprites/pokemon/${name}.png`;
};

const getOfficialArtworkImg = (id: number, form?: PokemonFormRef) => {
  const name = getImageId(id, form);

  return shiny
    ? `https://raw.githubusercontent.com/PokeAPI/sprites/refs/heads/master/sprites/pokemon/other/official-artwork/shiny/${name}.png`
    : // Use the "full" artwork URL instead of "detail" because the detail endpoint has incorrect images for some Pokémon (e.g. #676).
      `https://www.pokemon.com/static-assets/content-assets/cms2/img/pokedex/full/${name}.png`;
};

export const getPokemonImage = (id: number, form?: PokemonFormRef) => {
  switch (artwork) {
    case "pixel":
      return getPixelArtImg(id, form);
    default:
      return getOfficialArtworkImg(id, form);
  }
};

export const getMarkdownPokemonImage = (id: number, form?: PokemonFormRef) => {
  const src = getPokemonImage(id, form);
  const width = artwork === "pixel" ? 96 : 144;

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

export const calculateEffectiveness = (
  types: PokemonType[],
  allTypes: TypeChartType[],
) => {
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
        attacker.typenames[0]?.name || attacker.name,
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
      });
    } else if (factor < 1 && factor > 0) {
      resistant.push({
        text: `${factor}x ${typeNameMap.get(type)}`,
        color: typeColor[type],
      });
    } else if (factor === 0) {
      immune.push({
        text: `${typeNameMap.get(type)}`,
        color: typeColor[type],
      });
    }
  });

  return { normal, weak, immune, resistant };
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
