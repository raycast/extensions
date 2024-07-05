import { PokemonStatData } from "./pokemon";

interface StatInfo {
  base_stat: number;
  effort: number;
  stat: {
    name: string;
    url: string;
  };
}

interface TotalInfo {
  stats: StatInfo[];
}

export async function GetStats(id: string, totalInfo: TotalInfo, pokemonStatData: PokemonStatData) {
  console.log("Pokemon Stats finished.");
  // 定义一个映射，key是hp, attack... value是对应的更新结构体数据的函数
  const statMap: { [key: string]: (value: number) => void } = {
    hp: (value: number) => {
      pokemonStatData.base_stats.hp = value;
    },
    attack: (value: number) => {
      pokemonStatData.base_stats.attack = value;
    },
    defense: (value: number) => {
      pokemonStatData.base_stats.defense = value;
    },
    "special-attack": (value: number) => {
      pokemonStatData.base_stats.special_attack = value;
    },
    "special-defense": (value: number) => {
      pokemonStatData.base_stats.special_defense = value;
    },
    speed: (value: number) => {
      pokemonStatData.base_stats.speed = value;
    },
  };

  for (let i = 0; i < totalInfo.stats.length; i++) {
    const key = totalInfo.stats[i].stat.name;
    const value: number = totalInfo.stats[i].base_stat;
    statMap[key](value);
  }

  if (pokemonStatData.base_stats.total === 0) {
    pokemonStatData.base_stats.total = Object.values(pokemonStatData.base_stats).reduce((a, b) => a + b, 0);
  }
  // console.log('Pokemon Stats finished.')

  return pokemonStatData;
}
