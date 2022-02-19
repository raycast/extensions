export type PokeAPI = {
  data: Data;
  errors?: Error[];
};

export type Data = {
  pokemon_v2_pokemon: PokemonV2Pokemon[];
};

type Error = {
  extensions: Extensions;
  message: string;
};

type Extensions = {
  path: string;
  code: string;
};

export type PokemonV2Pokemon = {
  id: number;
  name: string;
  height: number;
  weight: number;
  pokemon_v2_pokemonabilities_aggregate: PokemonV2PokemonabilitiesAggregate;
  pokemon_v2_pokemonstats_aggregate: PokemonV2PokemonstatsAggregate;
  pokemon_v2_pokemontypes_aggregate: PokemonV2PokemontypesAggregate;
  pokemon_v2_pokemonspecy: PokemonV2Pokemonspecy;
};

type PokemonV2PokemonabilitiesAggregate = {
  nodes: PokemonV2PokemonabilitiesAggregateNode[];
};

type PokemonV2PokemonabilitiesAggregateNode = {
  is_hidden: boolean;
  pokemon_v2_ability: PokemonV2Ability;
};

type PokemonV2Ability = {
  pokemon_v2_abilitynames: PokemonV2Name[];
};

type PokemonV2Name = {
  genus: string;
  name: string;
};

export type PokemonV2Pokemonspecy = {
  is_mythical: boolean;
  is_legendary: boolean;
  is_baby: boolean;
  name: string;
  pokemon_v2_evolutionchain: PokemonV2Evolutionchain;
  pokemon_v2_pokemonspeciesnames: PokemonV2Name[];
  pokemon_v2_pokemonspeciesflavortexts: PokemonV2Pokemonspeciesflavortext[];
};

type PokemonV2Evolutionchain = {
  pokemon_v2_pokemonspecies: PokemonV2PokemonspecyElement[];
};

type PokemonV2PokemonspecyElement = {
  id: number;
  name: string;
  pokemon_v2_pokemonspeciesnames: PokemonV2Name[];
};

type PokemonV2Pokemonspeciesflavortext = {
  flavor_text: string;
  pokemon_v2_version: PokemonV2Version;
};

type PokemonV2Version = {
  id: number;
  name: string;
  pokemon_v2_versionnames: PokemonV2Name[];
};

type PokemonV2PokemonstatsAggregate = {
  nodes: PokemonV2PokemonstatsAggregateNode[];
  aggregate: Aggregate;
};

type Aggregate = {
  sum: Sum;
};

type Sum = {
  base_stat: number;
};

type PokemonV2PokemonstatsAggregateNode = {
  base_stat: number;
  pokemon_v2_stat: PokemonV2Stat;
};

type PokemonV2Stat = {
  name: string;
  pokemon_v2_statnames: PokemonV2Name[];
};

type PokemonV2PokemontypesAggregate = {
  nodes: PokemonV2PokemontypesAggregateNode[];
};

type PokemonV2PokemontypesAggregateNode = {
  pokemon_v2_type: PokemonV2Type;
};

type PokemonV2Type = {
  pokemon_v2_typenames: PokemonV2Name[];
};
