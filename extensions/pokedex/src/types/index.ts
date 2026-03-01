export interface PokeAPI<T> {
  data: Record<string, T[]>;
  errors?: Error[];
}

export interface Error {
  extensions: Extensions;
  message: string;
}

export interface Extensions {
  path: string;
  code: string;
}

export interface Pokemon {
  base_experience: number;
  id: number;
  name: string;
  height: number;
  pokemon_species_id: number;
  weight: number;
  encounters: PokemonEncounter[];
  pokemonabilities: PokemonAbility[];
  pokemonforms: PokemonFormType[];
  pokemonmoves: PokemonMove[];
  pokemonstats: PokemonStat[];
  pokemontypes: PokemonType[];
  pokemonspecy: PokemonSpecies;
}

export interface PokemonEncounter {
  locationarea: LocationArea;
  version: Version;
}

export interface LocationArea {
  name: string;
  locationareanames: Name[];
}

export interface PokemonAbility {
  is_hidden: boolean;
  ability: Ability;
}

export interface PokemonMove {
  level: number;
  move_id: number;
  move_learn_method_id: number;
  order: number;
  pokemon_id: number;
  move: Move;
  movelearnmethod: MoveLearnMethod;
  versiongroup: VersionGroup;
  pokemon: Pokemon;
}

export interface Machine {
  machine_number: number;
  version_group_id: number;
}

export interface MoveDamageClass {
  name: string;
  movedamageclassnames: Name[];
}

export interface MoveEffect {
  moveeffecteffecttexts: Effect[];
}

export interface Effect {
  short_effect: string;
  effect?: string;
}

export interface MoveLearnMethod {
  name: string;
  movelearnmethodnames: Name[];
}

export interface VersionGroup {
  id: number;
  generation_id: number;
  name: string;
  generation: Generation;
  versions: Version[];
}

export interface Generation {
  name: string;
  generationnames: Name[];
}

export interface Ability {
  id: number;
  name: string;
  abilitynames: Name[];
  abilityeffecttexts: Effect[];
  generation: Generation;
}

export interface Name {
  name: string;
}

export interface PokemonSpecies {
  id: number;
  base_happiness: number;
  capture_rate: number;
  evolves_from_species_id?: number;
  gender_rate: number;
  growth_rate_id: number;
  hatch_counter: number;
  is_baby: boolean;
  is_legendary: boolean;
  is_mythical: boolean;
  name: string;
  pokemon_shape_id: number;
  pokemondexnumbers: PokemonDexNumber[];
  evolutionchain: EvolutionChain;
  pokemonegggroups: PokemonEggGroup[];
  pokemons: PokemonForm[];
  pokemonspeciesflavortexts: PokemonSpeciesFlavorText[];
  pokemonspeciesnames: PokemonSpeciesName[];
}

export interface PokemonDexNumber {
  pokedex_number: number;
  pokedex: Pokedex;
}

export interface Pokedex {
  pokedexversiongroups: PokedexVersionGroup[];
}

export interface PokedexVersionGroup {
  version_group_id: number;
  versiongroup: VersionGroup;
}

export interface EvolutionChain {
  pokemonspecies: EvolutionSpecies[];
}

export interface EvolutionSpecies {
  id: number;
  name: string;
  evolves_from_species_id: number | null;
  pokemonspeciesnames: PokemonSpeciesName[];
}

export interface PokemonSpeciesName extends Name {
  genus: string;
  language_id: number;
}

export interface PokemonEggGroup {
  egggroup: EggGroup;
}

export interface EggGroup {
  name: string;
  egggroupnames: Name[];
}

export interface PokemonForm {
  name: string;
  height: number;
  weight: number;
  pokemonforms: PokemonFormType[];
  pokemonabilities: PokemonAbility[];
  pokemontypes: PokemonType[];
}

export interface PokemonFormType {
  form_name: string;
  pokemon_id: number;
  variety: boolean;
  pokemonformnames: PokemonFormName[];
  pokemonformtypes: PokemonType[];
}

export interface PokemonFormName {
  name: string;
  pokemon_name: string;
}

export interface FlavorText {
  flavor_text: string;
  version: Version;
  versiongroup: VersionGroup;
}

export interface PokemonSpeciesFlavorText {
  flavor_text: string;
  version: Version;
  versiongroup: VersionGroup;
}

export interface Version {
  id: number;
  name: string;
  version_group_id: number;
  versiongroup: VersionGroup;
  versionnames: Name[];
}

export interface PokemonStat {
  base_stat: number;
  effort: number;
  stat: Stat;
}

export interface Stat {
  name: string;
  statnames: Name[];
}

export interface PokemonType {
  type: Type;
}

export interface Type {
  id: number;
  name: string;
  typenames: Name[];
  typeefficacies: TypeEfficacy[];
}

export interface TypeEfficacy {
  damage_factor: number;
  damage_type_id: number;
  target_type_id: number;
  type: Type;
}

export interface Move {
  id: number;
  accuracy: number;
  name: string;
  move_effect_chance: number;
  power: number;
  pp: number;
  machines: Machine[];
  movedamageclass: MoveDamageClass;
  moveeffect: MoveEffect;
  movenames: Name[];
  type: PokemonType["type"];
  moveflavortexts: FlavorText[];
  pokemonmoves: PokemonMove[];
}

export interface TypeChartType {
  id: number;
  name: string;
  typenames: Name[];
  typeefficacies: {
    damage_factor: number;
    target_type_id: number;
    target_type: {
      name: string;
      typenames: Name[];
    };
  }[];
}

export interface Nature {
  id: number;
  name: string;
  naturenames: Name[];
  increased_stat_id: number | null;
  decreased_stat_id: number | null;
  increased_stat: {
    name: string;
    statnames: Name[];
  } | null;
  decreased_stat: {
    name: string;
    statnames: Name[];
  } | null;
}

export interface Item {
  id: number;
  name: string;
  itemnames: Name[];
  cost: number;
  itemcategory: ItemCategory;
  itemeffecttexts: Effect[];
  itemflavortexts: FlavorText[];
}

export interface ItemCategory {
  name: string;
  item_pocket_id: number;
  itemcategorynames: Name[];
  itempocket: ItemPocket;
}

export interface ItemPocket {
  name: string;
  itempocketnames: Name[];
}
