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

export interface PokemonV2Pokemon {
  base_experience: number;
  id: number;
  name: string;
  height: number;
  pokemon_species_id: number;
  weight: number;
  pokemon_v2_encounters: PokemonV2Encounter[];
  pokemon_v2_pokemonabilities: PokemonV2Pokemonability[];
  pokemon_v2_pokemonforms: PokemonV2Pokemonform[];
  pokemon_v2_pokemonmoves: PokemonV2Move[];
  pokemon_v2_pokemonstats: PokemonV2Pokemonstat[];
  pokemon_v2_pokemontypes: PokemonV2Pokemontype[];
  pokemon_v2_pokemonspecy: PokemonV2Pokemonspecy;
}

export interface PokemonV2Encounter {
  pokemon_v2_locationarea: PokemonV2Locationarea;
  pokemon_v2_version: PokemonV2Version;
}

export interface PokemonV2Locationarea {
  name: string;
  pokemon_v2_locationareanames: PokemonV2Name[];
}

export interface PokemonV2Pokemonability {
  is_hidden: boolean;
  pokemon_id: number;
  pokemon_v2_ability: PokemonV2Ability;
}

export interface PokemonV2Move {
  accuracy: number | null;
  id: number;
  level: number;
  move_effect_chance: number | null;
  move_id: number;
  move_learn_method_id: number;
  name: string;
  order: number | null;
  pokemon_id: number;
  power: number | null;
  pp: number | null;
  pokemon_v2_generation: PokemonV2Generation;
  pokemon_v2_machines: PokemonV2Machine[];
  pokemon_v2_move: PokemonV2Move;
  pokemon_v2_movedamageclass: PokemonV2Movedamageclass;
  pokemon_v2_moveeffect?: PokemonV2Moveeffect;
  pokemon_v2_moveflavortexts: PokemonV2Flavortext[];
  pokemon_v2_movelearnmethod: PokemonV2Movelearnmethod;
  pokemon_v2_movenames: PokemonV2Name[];
  pokemon_v2_pokemon: PokemonV2Pokemon;
  pokemon_v2_pokemonmoves: PokemonV2Move[];
  pokemon_v2_type: PokemonV2Type;
  pokemon_v2_versiongroup: PokemonV2Versiongroup;
}

export interface PokemonV2Machine {
  machine_number: number;
  version_group_id: number;
}

export interface PokemonV2Movedamageclass {
  pokemon_v2_movedamageclassnames: PokemonV2Name[];
}

export interface PokemonV2Moveeffect {
  pokemon_v2_moveeffecteffecttexts: PokemonV2Effecttext[];
}

export interface PokemonV2Effecttext {
  short_effect: string;
  effect: string;
}

export interface PokemonV2Movelearnmethod {
  name: string;
  pokemon_v2_movelearnmethodnames: PokemonV2Name[];
}

export interface PokemonV2Versiongroup {
  id: number;
  generation_id: number;
  name: string;
  pokemon_v2_generation: PokemonV2Generation;
  pokemon_v2_versions: PokemonV2Version[];
}

export interface PokemonV2Generation {
  name: string;
  pokemon_v2_generationnames: PokemonV2Name[];
}

export interface PokemonV2Ability {
  id: number;
  name: string;
  pokemon_v2_abilitynames: PokemonV2Name[];
  pokemon_v2_abilityeffecttexts: PokemonV2Effecttext[];
  pokemon_v2_abilityflavortexts: PokemonV2Flavortext[];
  pokemon_v2_generation: PokemonV2Generation;
  pokemon_v2_pokemonabilities: PokemonV2Pokemonability[];
}

export interface PokemonV2Name {
  name: string;
}

export interface PokemonV2Pokemonspecy {
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
  pokemon_v2_pokemondexnumbers: PokemonV2Pokemondexnumber[];
  pokemon_v2_evolutionchain: PokemonV2Evolutionchain;
  pokemon_v2_pokemonegggroups: PokemonV2Pokemonegggroup[];
  pokemon_v2_pokemons: PokemonV2Pokemon[];
  pokemon_v2_pokemonspeciesflavortexts: PokemonV2Flavortext[];
  pokemon_v2_pokemonspeciesnames: PokemonV2Pokemonspeciesname[];
}

export interface PokemonV2Pokemondexnumber {
  pokedex_number: number;
  pokemon_v2_pokedex: PokemonV2Pokedex;
}

export interface PokemonV2Pokedex {
  pokemon_v2_pokedexversiongroups: PokemonV2Version[];
}

export interface PokemonV2Evolutionchain {
  pokemon_v2_pokemonspecies: PokemonV2Pokemonspecy[];
}

export interface PokemonV2Pokemonspeciesname extends PokemonV2Name {
  genus: string;
  language_id: number;
}

export interface PokemonV2Pokemonegggroup {
  pokemon_v2_egggroup: PokemonV2Egggroup;
}

export interface PokemonV2Egggroup {
  pokemon_v2_egggroupnames: PokemonV2Name[];
  name: string;
}

export interface PokemonV2Pokemonform {
  form_name: string;
  pokemon_id: number;
  pokemon_v2_pokemonformnames: PokemonV2Pokemonformname[];
}

export interface PokemonV2Pokemonformname {
  name: string;
  pokemon_name: string;
}

export interface PokemonV2Flavortext {
  flavor_text: string;
  pokemon_v2_version: PokemonV2Version;
  pokemon_v2_versiongroup: PokemonV2Versiongroup;
}

export interface PokemonV2Version {
  id: number;
  name: string;
  version_group_id: number;
  pokemon_v2_versiongroup: PokemonV2Versiongroup;
  pokemon_v2_versionnames: PokemonV2Name[];
}

export interface PokemonV2Pokemonstat {
  base_stat: number;
  effort: number;
  pokemon_v2_stat: PokemonV2Stat;
}

export interface PokemonV2Stat {
  name: string;
  pokemon_v2_statnames: PokemonV2Name[];
}

export interface PokemonV2Pokemontype {
  pokemon_v2_type: PokemonV2Type;
}

export interface PokemonV2Type {
  name: string;
  pokemon_v2_typenames: PokemonV2Name[];
  pokemonV2TypeefficaciesByTargetTypeId: PokemonV2Typeefficacy[];
}

export interface PokemonV2Typeefficacy {
  damage_factor: number;
  damage_type_id: number;
  target_type_id: number;
  pokemon_v2_type: PokemonV2Type;
}
