import { LocalStorage } from "@raycast/api";

export interface HighScore {
  score: number;
  grid: string;
}

export async function saveHighScore(score: number, grid: string): Promise<boolean> {
  const maxScore = parseInt(((await LocalStorage.getItem("maxScore")) as string) || "0");
  if (score > maxScore) {
    await LocalStorage.setItem("maxScore", score.toString());
    await LocalStorage.setItem("maxScoreGrid", grid);
    return true;
  }
  return false;
}

export async function getHighScore(): Promise<HighScore | null> {
  const score = await LocalStorage.getItem<string>("maxScore");
  const grid = await LocalStorage.getItem<string>("maxScoreGrid");
  if (!score) return null;
  return { score: parseInt(score), grid: grid || "" };
}
