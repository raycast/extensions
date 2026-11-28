import got from "got";
import type { CharacterData, RankingResponse } from "./types.js";

// Nexon's rankings website uses these world IDs for both current and legacy characters.
const worlds: Record<number, string> = {
  0: "Scania",
  1: "Bera",
  2: "Broa",
  3: "Windia",
  4: "Khaini",
  5: "Bellocan",
  6: "Mardia",
  7: "Kradia",
  8: "Yellonde",
  9: "Demethos",
  10: "Galicia",
  11: "El Nido",
  12: "Zenith",
  13: "Arcania",
  14: "Chaos",
  15: "Nova",
  16: "Renegades",
  17: "Aurora",
  18: "Elysium",
  19: "Scania",
  30: "Luna",
  45: "Kronos",
  46: "Solis",
  48: "Challengers Interactive",
  49: "Challengers Interactive",
  52: "Challengers Heroic",
  54: "Challengers Heroic",
  70: "Hyperion",
};

export class CharacterNotFoundError extends Error {
  constructor() {
    super("Character not found in Nexon's rankings");
  }
}

export const lookupCharacter = async (region: string, characterName: string): Promise<CharacterData> => {
  const apiRegion = region === "gms" ? "na" : region === "ems" ? "eu" : undefined;
  if (!apiRegion) throw new Error("Unsupported region");
  const name = characterName.trim();
  const request = async (type: string, id: string) => {
    const response = await got(`https://www.nexon.com/api/maplestory/no-auth/ranking/v2/${apiRegion}`, {
      searchParams: { type, id, reboot_index: 0, page_index: 1, character_name: name },
      timeout: { request: 10000 },
      retry: { limit: 1 },
    }).json<RankingResponse>();
    if (!Array.isArray(response.ranks)) throw new Error("Unexpected rankings response");
    return response.ranks.find((entry) => entry.characterName.toLowerCase() === name.toLowerCase());
  };

  // Weekly/monthly results contain EXP gained during that period, not current EXP.
  const character = await request("overall", "legendary");
  if (!character) throw new CharacterNotFoundError();
  const [world, legion, job] = await Promise.all([
    request("world", String(character.worldID)),
    request("legion", String(character.worldID)),
    request("job", character.jobName),
  ]);
  return {
    Name: character.characterName,
    CharacterImageURL: character.characterImgURL,
    Class: character.jobName,
    Level: character.level,
    EXP: character.exp,
    Server: worlds[character.worldID] ?? `World ${character.worldID}`,
    GlobalRanking: character.rank,
    ClassRank: job?.rank,
    ServerRank: world?.rank,
    LegionLevel: legion?.legionLevel,
    LegionPower: legion?.raidPower,
    LegionRank: legion?.rank,
    LegionUnavailable: !legion,
    Region: region,
    Source: "nexon",
  };
};
