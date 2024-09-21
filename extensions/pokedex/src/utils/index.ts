import { Detail } from "@raycast/api";
import { PokemonV2Pokemontype } from "../types";

export const getPixelArtImg = (id: number) => {
  return `https://raw.githubusercontent.com/PokeAPI/sprites/refs/heads/master/sprites/pokemon/${id}.png`;
};

export const getOfficialArtworkImg = (id: number, formId?: number) => {
  const name = formId
    ? `${id.toString().padStart(3, "0")}_f${formId + 1}`
    : id.toString().padStart(3, "0");
  return `https://assets.pokemon.com/assets/cms2/img/pokedex/detail/${name}.png`;
};

export const typeColor: { [key: string]: string } = {
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

export const calculateEffectiveness = (types: PokemonV2Pokemontype[]) => {
  const effectivenessMap = new Map<string, number>();
  const typeNameMap = new Map<string, string>();

  types.forEach((type) => {
    type.pokemon_v2_type.pokemonV2TypeefficaciesByTargetTypeId.forEach(
      (efficacy) => {
        const relationName = efficacy.pokemon_v2_type.name;
        const currentFactor = effectivenessMap.get(relationName) || 1;
        effectivenessMap.set(
          relationName,
          (currentFactor * efficacy.damage_factor) / 100,
        );
        typeNameMap.set(
          relationName,
          efficacy.pokemon_v2_type.pokemon_v2_typenames[0].name,
        );
      },
    );
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
  pokemon: { localization: { [x: string]: string }; name: string },
  language: string | number,
) => {
  return pokemon.localization && pokemon.localization[language]
    ? pokemon.localization[language]
    : pokemon.name;
};
