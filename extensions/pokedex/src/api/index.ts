/* eslint-disable @typescript-eslint/no-explicit-any */
import { Cache, getPreferenceValues } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import axios, { AxiosRequestConfig, AxiosResponse } from "axios";
import { PokeAPI, PokemonV2Move, PokemonV2Pokemon } from "../types";

const cache = new Cache();
const { language: language_id, duration } = getPreferenceValues();
const expiration = Number(duration) * 24 * 60 * 60 * 1000; // cache expiration in ms

interface CachedData<T> {
  timestamp: number;
  value: T | undefined;
}

async function fetchDataWithCaching<T>(
  query: string,
  variables: Record<string, number>,
  prefix: string,
): Promise<T | undefined> {
  const key = `${prefix}-${JSON.stringify(variables)}`;
  const now = Date.now();

  // Check for cache expiration only if expiration is defined
  if (expiration) {
    const cachedData = cache.get(key);

    if (cachedData) {
      try {
        const parsed: CachedData<T> = JSON.parse(cachedData);

        // Ensure parsed data has required properties
        if (parsed.timestamp && parsed.value) {
          if (now - parsed.timestamp < expiration) {
            return parsed.value;
          }
        } else {
          console.warn(`Invalid cached data for key: ${key}`);
        }
      } catch (error) {
        console.error(`Error parsing cached data for key: ${key}`, error);
      }
    }
  }

  // Fetch fresh data if cache is expired or not enabled
  const config: AxiosRequestConfig = {
    method: "post",
    url: "https://beta.pokeapi.co/graphql/v1beta",
    headers: {
      "Content-Type": "application/json",
    },
    data: JSON.stringify({ query, variables }),
    timeout: 10000,
  };

  try {
    const { data }: AxiosResponse<PokeAPI<T>> = await axios(config);

    if (Array.isArray(data.errors) && data.errors.length) {
      showFailureToast(data.errors[0].message);

      return undefined;
    }

    const fetchedData = data.data[prefix][0];

    // Cache the fresh data with a timestamp
    const dataToCache: CachedData<T> = { timestamp: now, value: fetchedData };
    cache.set(key, JSON.stringify(dataToCache));

    return fetchedData;
  } catch (e: any) {
    showFailureToast(e.message);

    return undefined;
  }
}

export const fetchPokemonWithCaching = async (
  pokemon_id: number,
): Promise<PokemonV2Pokemon | undefined> => {
  const query = `query pokemon($language_id: Int, $pokemon_id: Int) {
    pokemon_v2_pokemon(where: {id: {_eq: $pokemon_id}}) {
      base_experience
      id
      name
      height
      weight
      pokemon_v2_encounters {
        pokemon_v2_locationarea {
          name
          pokemon_v2_locationareanames(where: {language_id: {_eq: $language_id}}) {
            name
          }
        }
        pokemon_v2_version {
          id
          name
          pokemon_v2_versiongroup {
            name
            pokemon_v2_generation {
              name
              pokemon_v2_generationnames(where: {language_id: {_eq: 9}}) {
                name
              }
            }
          }
          pokemon_v2_versionnames(where: {language_id: {_eq: $language_id}}) {
            name
          }
        }
      }
      pokemon_v2_pokemonabilities {
        is_hidden
        pokemon_v2_ability {
          pokemon_v2_abilitynames(where: {language_id: {_eq: $language_id}}) {
            name
          }
        }
      }
      pokemon_v2_pokemonmoves(order_by: {move_learn_method_id: asc, level: asc}) {
        level
        move_id
        move_learn_method_id
        order
        pokemon_v2_move {
          id
          accuracy
          name
          move_effect_chance
          power
          pp
          pokemon_v2_machines {
            machine_number
            version_group_id
          }
          pokemon_v2_movedamageclass {
            pokemon_v2_movedamageclassnames(where: {language_id: {_eq: 9}}) {
              name
            }
          }
          pokemon_v2_moveeffect {
            pokemon_v2_moveeffecteffecttexts(where: {language_id: {_eq: $language_id}}) {
              short_effect
            }
          }
          pokemon_v2_movenames(where: {language_id: {_eq: $language_id}}) {
            name
          }
          pokemon_v2_type {
            name
            pokemon_v2_typenames(where: {language_id: {_eq: $language_id}}) {
              name
            }
          }
        }
        pokemon_v2_movelearnmethod {
          name
          pokemon_v2_movelearnmethodnames(where: {language_id: {_eq: 9}}) {
            name
          }
        }
        pokemon_v2_versiongroup {
          id
          generation_id
          name
          pokemon_v2_generation {
            name
            pokemon_v2_generationnames(where: {language_id: {_eq: 9}}) {
              name
            }
          }
          pokemon_v2_versions {
            name
            pokemon_v2_versionnames(where: {language_id: {_eq: $language_id}}) {
              name
            }
          }
        }
      }
      pokemon_v2_pokemonstats {
        base_stat
        effort
        pokemon_v2_stat {
          name
          pokemon_v2_statnames(where: {language_id: {_eq: $language_id}}) {
            name
          }
        }
      }
      pokemon_v2_pokemontypes {
        pokemon_v2_type {
          name
          pokemon_v2_typenames(where: {language_id: {_eq: $language_id}}) {
            name
          }
          pokemonV2TypeefficaciesByTargetTypeId {
            damage_factor
            damage_type_id
            target_type_id
            pokemon_v2_type {
              name
              pokemon_v2_typenames(where: {language_id: {_eq: $language_id}}) {
                name
              }
            }
          }
        }
      }
      pokemon_v2_pokemonspecy {
        base_happiness
        capture_rate
        gender_rate
        growth_rate_id
        hatch_counter
        is_baby
        is_legendary
        is_mythical
        name
        pokemon_shape_id
        pokemon_v2_pokemondexnumbers {
          pokedex_number
          pokemon_v2_pokedex {
            pokemon_v2_pokedexversiongroups {
              version_group_id
              pokemon_v2_versiongroup {
                name
                pokemon_v2_versions {
                  id
                  name
                  pokemon_v2_versionnames(where: {language_id: {_eq: $language_id}}) {
                    name
                  }
                }
              }
            }
          }
        }
        pokemon_v2_evolutionchain {
          pokemon_v2_pokemonspecies(order_by: {order: asc}) {
            id
            name
            evolves_from_species_id
            pokemon_v2_pokemonspeciesnames(where: {language_id: {_eq: $language_id}}) {
              genus
              name
              language_id
            }
          }
        }
        pokemon_v2_pokemonegggroups {
          pokemon_v2_egggroup {
            name
            pokemon_v2_egggroupnames(where: {language_id: {_eq: $language_id}}) {
              name
            }
          }
        }
        pokemon_v2_pokemons(order_by: {id: asc}, where: {pokemon_v2_pokemonforms: {form_name: {_nin: ["starter", "totem", "totem-alola"]}}}) {
          name
          height
          weight
          pokemon_v2_pokemonforms {
            form_name
            pokemon_id
            pokemon_v2_pokemonformnames(where: {language_id: {_eq: $language_id}}) {
              name
              pokemon_name
            }
          }
          pokemon_v2_pokemonabilities {
            is_hidden
            pokemon_v2_ability {
              pokemon_v2_abilitynames(where: {language_id: {_eq: $language_id}}) {
                name
              }
            }
          }
          pokemon_v2_pokemontypes {
            pokemon_v2_type {
              name
              pokemon_v2_typenames(where: {language_id: {_eq: $language_id}}) {
                name
              }
              pokemonV2TypeefficaciesByTargetTypeId {
                damage_factor
                damage_type_id
                target_type_id
                pokemon_v2_type {
                  name
                  pokemon_v2_typenames(where: {language_id: {_eq: $language_id}}) {
                    name
                  }
                }
              }
            }
          }
        }
        pokemon_v2_pokemonspeciesflavortexts(where: {language_id: {_eq: $language_id}}) {
          flavor_text
          pokemon_v2_version {
            id
            name
            pokemon_v2_versiongroup {
              name
              pokemon_v2_generation {
                name
                pokemon_v2_generationnames(where: {language_id: {_eq: 9}}) {
                  name
                }
              }
            }
            pokemon_v2_versionnames(where: {language_id: {_eq: $language_id}}) {
              name
            }
          }
        }
        pokemon_v2_pokemonspeciesnames {
          genus
          name
          language_id
        }
      }
    }
  }`;

  const variables = { language_id, pokemon_id };

  return fetchDataWithCaching(query, variables, "pokemon_v2_pokemon");
};

export const fetchMoveWithCaching = async (
  move_id: number,
): Promise<PokemonV2Move | undefined> => {
  const query = `query move($language_id: Int, $move_id: Int) {
    pokemon_v2_move(where: {id: {_eq: $move_id}}) {
      id
      accuracy
      name
      power
      pp
      move_effect_chance
      pokemon_v2_pokemonmoves(order_by: {move_learn_method_id: asc, level: asc}) {
        level
        move_learn_method_id
        pokemon_id
        pokemon_v2_movelearnmethod {
          name
          pokemon_v2_movelearnmethodnames(where: {language_id: {_eq: 9}}) {
            name
          }
        }
        pokemon_v2_pokemon {
          pokemon_species_id
          pokemon_v2_pokemonspecy {
            pokemon_v2_pokemonspeciesnames(where: {language_id: {_eq: $language_id}}) {
              name
            }
            pokemon_v2_pokemons(order_by: {id: asc}, where: {pokemon_v2_pokemonforms: {form_name: {_nin: ["starter", "totem", "totem-alola"]}}}) {
              name
              pokemon_v2_pokemonforms {
                form_name
                pokemon_id
                pokemon_v2_pokemonformnames(where: {language_id: {_eq: $language_id}}) {
                  name
                  pokemon_name
                }
              }
            }
          }
        }
      }
      pokemon_v2_generation {
        pokemon_v2_generationnames(where: {language_id: {_eq: 9}}) {
          name
        }
      }
      pokemon_v2_movedamageclass {
        pokemon_v2_movedamageclassnames(where: {language_id: {_eq: 9}}) {
          name
        }
      }
      pokemon_v2_type {
        name
        pokemon_v2_typenames(where: {language_id: {_eq: $language_id}}) {
          name
        }
      }
      pokemon_v2_moveflavortexts(where: {language_id: {_eq: $language_id}}) {
        flavor_text
        pokemon_v2_versiongroup {
          name
          pokemon_v2_generation {
            name
            pokemon_v2_generationnames(where: {language_id: {_eq: 9}}) {
              name
            }
          }
          pokemon_v2_versions {
            name
            pokemon_v2_versionnames(where: {language_id: {_eq: $language_id}}) {
              name
            }
          }
        }
      }
      pokemon_v2_moveeffect {
        pokemon_v2_moveeffecteffecttexts(where: {language_id: {_eq: $language_id}}) {
          short_effect
          effect
        }
      }
      pokemon_v2_movenames(where: {language_id: {_eq: $language_id}}) {
        name
      }
    }
  }`;

  const variables = { language_id, move_id };

  return fetchDataWithCaching(query, variables, "pokemon_v2_move");
};
