import { Detail, getPreferenceValues } from "@raycast/api";
import { PokemonV2Pokemon, PokemonV2Pokemontype } from "../types";

const { artwork } = getPreferenceValues();

export const nationalDexNumber = (id: number) => {
  return `#${id.toString().padStart(4, "0")}`;
};

const getPixelArtImg = (id: number) => {
  return `https://raw.githubusercontent.com/PokeAPI/sprites/refs/heads/master/sprites/pokemon/${id}.png`;
};

export const getOfficialArtworkImg = (id: number, order?: number) => {
  const name = order
    ? `${id.toString().padStart(3, "0")}_f${order + 1}`
    : id.toString().padStart(3, "0");
  return `https://assets.pokemon.com/assets/cms2/img/pokedex/detail/${name}.png`;
};

export const getContentImg = (id: number, order?: number) => {
  switch (artwork) {
    case "pixel":
      return getPixelArtImg(id);
    default:
      return getOfficialArtworkImg(id, order);
  }
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
  pokemon: { localization: Record<string, string>; name: string },
  language: string | number,
) => {
  return pokemon.localization && pokemon.localization[language]
    ? pokemon.localization[language]
    : pokemon.name;
};

export const filterPokemonForms = (
  id: number,
  pokemons: PokemonV2Pokemon[],
) => {
  // removes Pokemon forms without official images on pokemon.com
  let formNames: string[] = [];
  let varieties: string[] = [];
  switch (id) {
    case 25:
      formNames = ["pikachu", "pikachu-gmax"];
      break;
    case 555:
      formNames = ["darmanitan-standard", "darmanitan-galar-standard"];
      break;
    case 666:
      varieties = [
        "meadow",
        "continental",
        "garden",
        "elegant",
        "marine",
        "high-plains",
        "river",
      ];
      break;
    // case 668:
    //   // male, female
    //   break
    case 670:
      formNames = ["floette"];
      varieties = ["red"];
      break;
    case 671:
      varieties = ["red"];
      break;
    case 676:
      varieties = ["natural", "heart", "star", "diamond"];
      break;
    case 718:
      formNames = [
        "zygarde-10-power-construct",
        "zygarde-50-power-construct",
        "zygarde-complete",
      ];
      break;
    case 744:
      formNames = ["rockruff"];
      break;
    case 774:
      formNames = ["minior-red-meteor", "minior-red"];
      break;
    case 778:
      formNames = ["mimikyu-disguised"];
      break;
    case 845:
      formNames = ["cramorant"];
      break;
    case 849:
      formNames = [
        "toxtricity-amped",
        "toxtricity-low-key",
        "toxtricity-amped-gmax",
      ];
      break;
    case 875:
      // eiscue-noice available in Zukan, but not in pokemon.com at the moment
      formNames = ["eiscue-ice"];
      break;
    case 893:
      formNames = ["zarude-dada"];
      break;
    case 1007:
      formNames = ["koraidon"];
      break;
    case 1008:
      formNames = ["miraidon"];
      break;
    default:
      break;
  }

  if (formNames.length) {
    pokemons = pokemons.filter((p) => formNames.includes(p.name));
  }

  const forms: PokemonV2Pokemon[] = [];

  pokemons.forEach((p) => {
    if (varieties.length) {
      varieties.forEach((variety) => {
        const pokemonforms = p.pokemon_v2_pokemonforms.filter(
          (f) => f.form_name === variety,
        );

        forms.push({
          ...p,
          pokemon_v2_pokemonforms: pokemonforms,
        });
      });
    } else {
      forms.push(p);
    }
  });

  return forms;
};
