import type { Player } from "../types/player.types";

const generatePlayerRankData = (player: Player) => {
  const playerRank = player?.ranking?.rank;
  const playerSkill = player?.ranking?.skill;
  const rankingName = playerRank.displayName;
  const rankingTier = playerRank.tier.toLowerCase();
  const rankingLevel = playerRank.level;
  const rankingImage = `https://aimlab.gg/static/aimlab/ranks/${rankingTier}_${rankingLevel}.png`;
  const progress = ((playerSkill - playerRank.minSkill) / (playerRank.maxSkill - playerRank.minSkill)) * 100;
  const playerLink = "https://aimlab.gg/u/" + encodeURIComponent(player.username);

  return {
    playerSkill,
    rankingName,
    rankingTier,
    rankingLevel,
    rankingImage,
    progress,
    playerLink,
  };
};

export default generatePlayerRankData;
