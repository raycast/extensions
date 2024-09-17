import damageRelations from "../statics/damage_relations.json";
import { PokemonV2Pokemontype } from "../types";

export const getImgUrl = (id: number, formId?: number) => {
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
