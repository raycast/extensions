import { environment } from "@raycast/api";
import { existsSync, mkdirSync } from "fs";
import { join } from "path";

import { generate_character_card } from "rust:../../../rust";

export async function getCachedCard(id: string, char: GenshinCharacter): Promise<string> {
  const cacheDir = join(environment.supportPath, "generated_cards");
  const outputPath = join(cacheDir, `${id}.webp`);

  if (existsSync(outputPath)) {
    return `file://${outputPath.replace(/\\/g, "/")}`;
  }

  if (!existsSync(cacheDir)) mkdirSync(cacheDir, { recursive: true });

  const rarity = char.qualityType;
  const avatarFile = `${char.CardImg.replace("UI_Gacha_", "UI_")}.png`;
  const bgPath = join(environment.assetsPath, "rarity_background", `${rarity}.png`);

  try {
    const result = await generate_character_card(id, avatarFile, bgPath, outputPath);
    return `file://${result.replace(/\\/g, "/")}`;
  } catch (error) {
    console.error("Rust Bridge Error:", error);
    return `https://api.lunaris.moe/data/assets/avataricon/${avatarFile}`;
  }
}
