/* eslint-disable @typescript-eslint/no-explicit-any */
import { Cache, getPreferenceValues } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import axios, { AxiosRequestConfig, AxiosResponse } from "axios";
import {
  PokeAPI,
  Pokemon,
  TypeChartType,
  Nature,
  Move,
  Ability,
  Item,
} from "../types";

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
  isArray = false,
): Promise<T | undefined> {
  // Create a simple hash of the query to include in the cache key
  const queryHash = query
    .split("")
    .reduce((a, b) => {
      a = (a << 5) - a + b.charCodeAt(0);
      return a & a;
    }, 0)
    .toString(36);

  const key = `${prefix}-${JSON.stringify(variables)}-${isArray}-${queryHash}`;
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
    url: "https://graphql.pokeapi.co/v1beta2",
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

    const fetchedData = (isArray
      ? data.data[prefix]
      : data.data[prefix][0]) as unknown as T;

    // Cache the fresh data with a timestamp
    const dataToCache: CachedData<T> = { timestamp: now, value: fetchedData };
    cache.set(key, JSON.stringify(dataToCache));

    return fetchedData;
  } catch (e: any) {
    showFailureToast(e.message);

    return undefined;
  }
}

export const fetchPokemon = async (
  pokemon_id: number,
): Promise<Pokemon | undefined> => {
  const query = `query pokemon($language_id: Int, $pokemon_id: Int) {
    pokemon(where: {id: {_eq: $pokemon_id}}) {
      base_experience
      id
      name
      height
      weight
      encounters {
        locationarea {
          name
          locationareanames(where: {language_id: {_eq: $language_id}}) {
            name
          }
        }
        version {
          id
          name
          versiongroup {
            name
            generation {
              name
              generationnames(where: {language_id: {_eq: $language_id}}) {
                name
              }
            }
          }
          versionnames(where: {language_id: {_eq: $language_id}}) {
            name
          }
        }
      }
      pokemonabilities {
        is_hidden
        ability {
          abilitynames(where: {language_id: {_eq: $language_id}}, distinct_on: [name]) {
            name
          }
        }
      }
      pokemonmoves(order_by: {move_learn_method_id: asc, level: asc}) {
        level
        move_id
        move_learn_method_id
        order
        move {
          id
          accuracy
          name
          move_effect_chance
          power
          pp
          machines {
            machine_number
            version_group_id
          }
          movedamageclass {
            name
            movedamageclassnames(where: {language_id: {_eq: $language_id}}) {
              name
            }
          }
          moveeffect {
            moveeffecteffecttexts(where: {language_id: {_eq: $language_id}}) {
              short_effect
            }
          }
          movenames(where: {language_id: {_eq: $language_id}}) {
            name
          }
          type {
            id
            name
            typenames(where: {language_id: {_eq: $language_id}}) {
              name
            }
          }
        }
        movelearnmethod {
          name
          movelearnmethodnames(where: {language_id: {_eq: 9}}) {
            name
          }
        }
        versiongroup {
          id
          generation_id
          name
          generation {
            name
            generationnames(where: {language_id: {_eq: $language_id}}) {
              name
            }
          }
          versions {
            name
            versionnames(where: {language_id: {_eq: $language_id}}) {
              name
            }
          }
        }
      }
      pokemonstats {
        base_stat
        effort
        stat {
          name
          statnames(where: {language_id: {_eq: $language_id}}) {
            name
          }
        }
      }
      pokemontypes {
        type {
          id
          name
          typenames(where: {language_id: {_eq: $language_id}}) {
            name
          }
          typeefficacies(where: {damage_factor: {_neq: 100}}) {
            damage_factor
            damage_type_id
            target_type_id
            type {
              name
              typenames(where: {language_id: {_eq: $language_id}}) {
                name
              }
            }
          }
        }
      }
      pokemonspecy {
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
        pokemondexnumbers {
          pokedex_number
          pokedex {
            pokedexversiongroups {
              version_group_id
              versiongroup {
                name
                versions {
                  id
                  name
                  versionnames(where: {language_id: {_eq: $language_id}}) {
                    name
                  }
                }
              }
            }
          }
        }
        evolutionchain {
          pokemonspecies(order_by: {order: asc}) {
            id
            name
            evolves_from_species_id
            pokemonspeciesnames(where: {language_id: {_eq: $language_id}}) {
              genus
              name
              language_id
            }
          }
        }
        pokemonegggroups {
          egggroup {
            name
            egggroupnames(where: {language_id: {_eq: $language_id}}) {
              name
            }
          }
        }
        pokemons(
          order_by: {id: asc}
          where: {pokemonforms: {form_name: {_nin: ["starter", "totem", "totem-alola"]}}}
        ) {
          name
          height
          weight
          pokemonforms {
            form_name
            pokemon_id
            pokemonformnames(where: {language_id: {_eq: $language_id}}) {
              name
              pokemon_name
            }
            pokemonformtypes {
              type {
                id
                name
                typenames(where: {language_id: {_eq: $language_id}}) {
                  name
                }
                typeefficacies(where: {damage_factor: {_neq: 100}}) {
                  damage_factor
                  damage_type_id
                  target_type_id
                  type {
                    name
                    typenames(where: {language_id: {_eq: $language_id}}) {
                      name
                    }
                  }
                }
              }
            }
          }
          pokemonabilities {
            is_hidden
            ability {
              abilitynames(where: {language_id: {_eq: $language_id}}, distinct_on: [name]) {
                name
              }
            }
          }
          pokemontypes {
            type {
              id
              name
              typenames(where: {language_id: {_eq: $language_id}}) {
                name
              }
              typeefficacies(where: {damage_factor: {_neq: 100}}) {
                damage_factor
                damage_type_id
                target_type_id
                type {
                  name
                  typenames(where: {language_id: {_eq: $language_id}}) {
                    name
                  }
                }
              }
            }
          }
        }
        pokemonspeciesflavortexts(
          where: {language_id: {_eq: $language_id}}
          order_by: {version_id: asc}
        ) {
          flavor_text
          version {
            id
            name
            versiongroup {
              id
              name
              generation_id
              generation {
                name
                generationnames(where: {language_id: {_eq: $language_id}}) {
                  name
                }
              }
              versions {
                id
                name
                versionnames(where: {language_id: {_eq: $language_id}}) {
                  name
                }
              }
            }
            versionnames(where: {language_id: {_eq: $language_id}}) {
              name
            }
          }
        }
        pokemonspeciesnames {
          genus
          name
          language_id
        }
      }
    }
  }`;

  const variables = { language_id, pokemon_id };

  return fetchDataWithCaching(query, variables, "pokemon");
};

export const fetchMoves = async (): Promise<Move[] | undefined> => {
  const query = `query moves($language_id: Int) {
    move(order_by: [{generation_id: asc}, {name: asc}]) {
      id
      accuracy
      name
      power
      pp
      move_effect_chance
      move_effect_id
      move_target_id
      generation {
        generationnames(where: {language_id: {_eq: $language_id}}) {
          name
        }
      }
      movedamageclass {
        name
        movedamageclassnames(where: {language_id: {_eq: $language_id}}) {
          name
        }
      }
      type {
        name
        typenames(where: {language_id: {_eq: $language_id}}) {
          name
        }
      }
      moveeffect {
        moveeffecteffecttexts(where: {language_id: {_eq: $language_id}}) {
          short_effect
          effect
        }
      }
      movenames(where: {language_id: {_eq: $language_id}}) {
        name
      }
    }
  }`;

  const variables = { language_id };

  return fetchDataWithCaching(query, variables, "move", true);
};

export const fetchMove = async (move_id: number): Promise<Move | undefined> => {
  const query = `query move($language_id: Int, $move_id: Int) {
    move(where: {id: {_eq: $move_id}}) {
      id
      accuracy
      name
      power
      pp
      move_effect_chance
      pokemonmoves(order_by: {move_learn_method_id: asc, level: asc}) {
        level
        move_learn_method_id
        pokemon_id
        movelearnmethod {
          name
          movelearnmethodnames(where: {language_id: {_eq: 9}}) {
            name
          }
        }
        pokemon {
          pokemon_species_id
          pokemonspecy {
            pokemonspeciesnames(where: {language_id: {_eq: $language_id}}) {
              name
            }
              pokemons(order_by: {id: asc}, where: {pokemonforms: {form_name: {_nin: ["starter", "totem", "totem-alola"]}}}) {
              name
              pokemonforms {
                form_name
                pokemon_id
                pokemonformnames(where: {language_id: {_eq: $language_id}}) {
                  name
                  pokemon_name
                }
              }
            }
          }
        }
      }
      generation {
        generationnames(where: {language_id: {_eq: $language_id}}) {
          name
        }
      }
      movedamageclass {
        name
        movedamageclassnames(where: {language_id: {_eq: $language_id}}) {
          name
        }
      }
      type {
        name
        typenames(where: {language_id: {_eq: $language_id}}) {
          name
        }
      }
      moveflavortexts(where: {language_id: {_eq: $language_id}}) {
        flavor_text
        versiongroup {
          name
          generation {
            name
            generationnames(where: {language_id: {_eq: $language_id}}) {
              name
            }
          }
          versions {
            name
            versionnames(where: {language_id: {_eq: $language_id}}) {
              name
            }
          }
        }
      }
      moveeffect {
        moveeffecteffecttexts(where: {language_id: {_eq: $language_id}}) {
          short_effect
          effect
        }
      }
      movenames(where: {language_id: {_eq: $language_id}}) {
        name
      }
    }
  }`;

  const variables = { language_id, move_id };

  return fetchDataWithCaching(query, variables, "move");
};

export const fetchTypes = async (): Promise<TypeChartType[] | undefined> => {
  const query = `query types($language_id: Int) {
    type(where: {id: {_lte: 18}}) {
      name
      id
      typenames(where: {language_id: {_eq: $language_id}}) {
        name
      }
      typeefficacies {
        damage_factor
        target_type_id
        target_type: type {
          name
          typenames(where: {language_id: {_eq: $language_id}}) {
            name
          }
        }
      }
    }
  }`;

  const variables = { language_id };

  return fetchDataWithCaching(query, variables, "type", true);
};

export const fetchNatures = async (): Promise<Nature[] | undefined> => {
  const query = `query natures($language_id: Int) {
    nature {
      id
      name
      naturenames(where: {language_id: {_eq: $language_id}}) {
        name
      }
      increased_stat_id
      decreased_stat_id
      increased_stat: StatByIncreasedStatId {
        name
        statnames(where: {language_id: {_eq: $language_id}}) {
          name
        }
      }
      decreased_stat: stat {
        name
        statnames(where: {language_id: {_eq: $language_id}}) {
          name
        }
      }
    }
  }`;

  const variables = { language_id };

  return fetchDataWithCaching(query, variables, "nature", true);
};

export const fetchAbilities = async (): Promise<Ability[] | undefined> => {
  const query = `query abilities($language_id: Int) {
    ability(order_by: [{generation_id: asc}, {name: asc}]) {
      id
      name
      abilitynames(where: {language_id: {_eq: $language_id}}) {
        name
      }
      abilityeffecttexts(where: {language_id: {_eq: $language_id}}) {
        short_effect
        effect
      }
      generation {
        name
        generationnames(where: {language_id: {_eq: $language_id}}) {
          name
        }
      }
    }
  }`;

  const variables = { language_id };

  return fetchDataWithCaching(query, variables, "ability", true);
};

export const fetchItems = async (): Promise<Item[] | undefined> => {
  const query = `query items($language_id: Int) {
    item {
      id
      name
      cost
      itemnames(where: {language_id: {_eq: $language_id}}) {
        name
      }
      itemcategory {
        name
        item_pocket_id
        itemcategorynames(where: {language_id: {_eq: $language_id}}) {
          name
        }
        itempocket {
          name
          itempocketnames(where: {language_id: {_eq: $language_id}}) {
            name
          }
        }
      }
      itemeffecttexts(where: {language_id: {_eq: $language_id}}) {
        short_effect
        effect
      }
    }
  }`;

  const variables = { language_id };

  return fetchDataWithCaching(query, variables, "item", true);
};

export const fetchItem = async (item_id: number): Promise<Item | undefined> => {
  const query = `query item($language_id: Int, $item_id: Int) {
    item(where: {id: {_eq: $item_id}}) {
      id
      name
      cost
      itemnames(where: {language_id: {_eq: $language_id}}) {
        name
      }
      itemcategory {
        name
        item_pocket_id
        itemcategorynames(where: {language_id: {_eq: $language_id}}) {
          name
        }
        itempocket {
          name
          itempocketnames(where: {language_id: {_eq: $language_id}}) {
            name
          }
        }
      }
      itemeffecttexts(where: {language_id: {_eq: $language_id}}) {
        short_effect
        effect
      }
      itemflavortexts(where: {language_id: {_eq: $language_id}}) {
        flavor_text
        versiongroup {
          name
          generation {
            name
            generationnames(where: {language_id: {_eq: $language_id}}) {
              name
            }
          }
          versions {
            name
            versionnames(where: {language_id: {_eq: $language_id}}) {
              name
            }
          }
        }
      }
    }
  }`;

  const variables = { language_id, item_id };

  return fetchDataWithCaching(query, variables, "item");
};
