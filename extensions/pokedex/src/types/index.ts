export interface PokeAPI {
  data: Data;
  errors?: Error[];
}

export interface Data {
  pokemon_v2_pokemon: PokemonV2Pokemon[];
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
  weight: number;
  pokemon_v2_pokemonabilities: PokemonV2Pokemonability[];
  pokemon_v2_pokemonstats: PokemonV2Pokemonstat[];
  pokemon_v2_pokemontypes: PokemonV2Pokemontype[];
  pokemon_v2_pokemonspecy: PokemonV2Pokemonspecy;
}

export interface PokemonV2Pokemonability {
  is_hidden: boolean;
  pokemon_v2_ability: PokemonV2Ability;
}

export interface PokemonV2Ability {
  pokemon_v2_abilitynames: PokemonV2Name[];
}

export interface PokemonV2Name {
  name: string;
}

export interface PokemonV2Pokemonspecy {
  base_happiness: number;
  capture_rate: number;
  gender_rate: number;
  growth_rate_id: number;
  hatch_counter: number;
  is_baby: boolean;
  is_legendary: boolean;
  is_mythical: boolean;
  name: string;
  pokemon_v2_evolutionchain: PokemonV2Evolutionchain;
  pokemon_v2_pokemonegggroups: PokemonV2Pokemonegggroup[];
  pokemon_v2_pokemons: PokemonV2PokemonspecyPokemonV2Pokemon[];
  pokemon_v2_pokemonspeciesflavortexts: PokemonV2Pokemonspeciesflavortext[];
  pokemon_v2_pokemonspeciesnames: PokemonV2Pokemonspeciesname[];
}

export interface PokemonV2Evolutionchain {
  pokemon_v2_pokemonspecies: PokemonV2PokemonspecyElement[];
}

export interface PokemonV2PokemonspecyElement {
  id: number;
  name: string;
  evolves_from_species_id?: number;
  pokemon_v2_pokemonspeciesnames: PokemonV2Pokemonspeciesname[];
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

export interface PokemonV2PokemonspecyPokemonV2Pokemon {
  name: string;
  pokemon_v2_pokemonforms: PokemonV2Pokemonform[];
  pokemon_v2_pokemontypes: PokemonV2Pokemontype[];
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

export interface PokemonV2Pokemonspeciesflavortext {
  flavor_text: string;
  pokemon_v2_version: PokemonV2Version;
}

export interface PokemonV2Version {
  id: number;
  name: string;
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
}
