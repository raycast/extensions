import { Platform, REGIONS } from "./regions";
import { AccountDto, LeagueEntryDto, RiotApi, RiotError } from "./riot";

/** Who to look up: either a Riot ID, or a PUUID (as found in a match) with the platform it was played on. */
export interface PlayerTarget {
  puuid?: string;
  gameName?: string;
  tagLine?: string;
  platform?: Platform;
}

export interface Profile {
  puuid: string;
  gameName: string;
  tagLine: string;
  platform: Platform;
  level: number;
  profileIconId: number;
  ranked: LeagueEntryDto[];
}

export const RANKED_QUEUES: Record<string, string> = {
  RANKED_SOLO_5x5: "Ranked Solo/Duo",
  RANKED_FLEX_SR: "Ranked Flex",
};

export async function loadProfile(api: RiotApi, target: PlayerTarget, fallback: Platform): Promise<Profile> {
  const hint = target.platform ?? fallback;

  let account: AccountDto;
  if (target.puuid) {
    account = await api.accountByPuuid(target.puuid, hint);
  } else if (target.gameName && target.tagLine) {
    try {
      account = await api.accountByRiotId(target.gameName, target.tagLine, hint);
    } catch (error) {
      if (error instanceof RiotError && error.kind === "not-found") {
        throw new RiotError("not-found", `No Riot account named ${target.gameName}#${target.tagLine}.`, 404);
      }
      throw error;
    }
  } else {
    throw new RiotError("not-found", "Enter a Riot ID like Name#TAG.");
  }

  // Account data is global, but everything else lives on the player's own platform.
  const platform = target.platform ?? (await api.activeRegion(account.puuid, hint).catch(() => undefined)) ?? fallback;
  const gameName = account.gameName ?? target.gameName ?? "";
  const tagLine = account.tagLine ?? target.tagLine ?? "";

  try {
    const [summoner, entries] = await Promise.all([
      api.summoner(account.puuid, platform),
      api.leagueEntries(account.puuid, platform),
    ]);
    return {
      puuid: account.puuid,
      gameName,
      tagLine,
      platform,
      level: summoner.summonerLevel,
      profileIconId: summoner.profileIconId,
      ranked: entries.filter((entry) => entry.queueType in RANKED_QUEUES),
    };
  } catch (error) {
    if (error instanceof RiotError && error.kind === "not-found") {
      throw new RiotError(
        "not-found",
        `${gameName}#${tagLine} has no League of Legends profile on ${REGIONS[platform].title}.`,
        404,
      );
    }
    throw error;
  }
}
