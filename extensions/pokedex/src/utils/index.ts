import damageRelations from "../statics/damage_relations.json";
import { PokemonV2Pokemontype } from "../types";

export const getImgUrl = (id: number, formId?: number) => {
  const name = formId
    ? `${id.toString().padStart(3, "0")}_f${formId + 1}`
    : id.toString().padStart(3, "0");
  return `https://assets.pokemon.com/assets/cms2/img/pokedex/detail/${name}.png`;
};

export const typeColor: { [key: string]: string } = {
  normal: "#a8a77a",
  fire: "#ee8130",
  water: "#6390f0",
  electric: "#f7d02c",
  grass: "#7ac74c",
  ice: "#96d9d6",
  fighting: "#c22e28",
  poison: "#a33ea1",
  ground: "#e2bf65",
  flying: "#a98ff3",
  psychic: "#f95587",
  bug: "#a6b91a",
  rock: "#b6a136",
  ghost: "#735797",
  dragon: "#6f35fc",
  dark: "#705746",
  steel: "#b7b7ce",
  fairy: "#d685ad",
};

export const calculateEffectiveness = (types: PokemonV2Pokemontype[]) => {
  const effectivenessMap = new Map<string, number>();
  Object.entries(damageRelations).forEach(([key, value]) =>
    types.forEach((type) => {
      if (key == type.pokemon_v2_type.name) {
        const typeEffectiveness = value;
        if (typeEffectiveness) {
          value.double_damage_from.forEach((relation) => {
            const currentFactor = effectivenessMap.get(relation.name) || 1;
            effectivenessMap.set(relation.name, currentFactor * 2);
          });
          value.half_damage_from.forEach((relation) => {
            const currentFactor = effectivenessMap.get(relation.name) || 1;
            effectivenessMap.set(relation.name, currentFactor * 0.5);
          });
          value.no_damage_from.forEach((relation) => {
            const currentFactor = effectivenessMap.get(relation.name) || 1;
            effectivenessMap.set(relation.name, currentFactor * 0);
          });
        }
      }
    }),
  );

  const normal: string[] = [];
  const weak: string[] = [];
  const immune: string[] = [];
  const resistant: string[] = [];

  effectivenessMap.forEach((factor, typeName) => {
    if (factor > 1) {
      weak.push(
        `${factor}x ${typeName.charAt(0).toUpperCase() + typeName.slice(1)}`,
      );
    } else if (factor < 1 && factor > 0) {
      resistant.push(
        `${factor}x ${typeName.charAt(0).toUpperCase() + typeName.slice(1)}`,
      );
    } else if (factor === 0) {
      immune.push(`${typeName.charAt(0).toUpperCase() + typeName.slice(1)}`);
    }
  });

  return { normal, weak, immune, resistant };
};
