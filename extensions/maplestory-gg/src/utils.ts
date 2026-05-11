import { LocalStorage } from "@raycast/api";
import got from "got";
import ChartJsImage from "chartjs-to-image";
import { CharacterData, CharacterResponse, GraphDataItem } from "./types.js";

export const favoriteCharacterPrefix = "favorite-character";

export const lookupCharacter = async (region: string, characterName: string) => {
  const url = `https://api.maplestory.gg/v2/public/character/${region}/${characterName}`;
  const character = await got(url).json<CharacterResponse>();
  return { ...character.CharacterData, Region: region };
};

export const getUnit = (exp: number[]) => {
  const trillion = 10 ** 12;
  const billion = 10 ** 9;
  const million = 10 ** 6;
  const thousand = 10 ** 3;
  const maxExp = Math.max(...exp);
  if (maxExp >= 10 ** 12) return { unit: "(trillion)", base: trillion };
  if (maxExp >= 10 ** 9) return { unit: "(billion)", base: billion };
  if (maxExp >= 10 ** 6) return { unit: "(million)", base: million };
  if (maxExp >= 10 ** 3) return { unit: "(k)", base: thousand };
  return { unit: "", base: 1 };
};

export const intializeChart = (chart: ChartJsImage) => {
  chart.setDevicePixelRatio(2);
  chart.setWidth(500);
  chart.setHeight(200);
  chart.setFormat("webp");
  chart.setBackgroundColor("#ffffff00");
};

export const generateDailyExpDifferenceChart = async (graphData: GraphDataItem[]) => {
  const chart = new ChartJsImage();
  const expLabels = graphData.map((item) => item.DateLabel);
  const expDataOriginal = graphData.map((item) => item.EXPDifference);
  const { unit, base } = getUnit(expDataOriginal);
  const expData = expDataOriginal.map((item) => item / base);
  intializeChart(chart);
  chart.setConfig({
    type: "bar",
    data: { labels: expLabels, datasets: [{ label: `Daily Exp Diff ${unit}`, data: expData }] },
  });
  const dataUrl = await chart.toDataUrl();
  return dataUrl;
};

export const generateTotalExpChart = async (graphData: GraphDataItem[]) => {
  const chart = new ChartJsImage();
  const expLabels = graphData.map((item) => item.DateLabel);
  const expDataOriginal = graphData.map((item) => item.TotalOverallEXP);
  const { unit, base } = getUnit(expDataOriginal);
  const expData = expDataOriginal.map((item) => item / base);
  intializeChart(chart);
  chart.setConfig({
    type: "line",
    data: { labels: expLabels, datasets: [{ label: `Total Exp ${unit}`, data: expData }] },
  });
  const dataUrl = await chart.toDataUrl();
  return dataUrl;
};

export const hasCharacterInFavorites = async (character: CharacterData) => {
  return Boolean(await LocalStorage.getItem([favoriteCharacterPrefix, character.Region, character.Name].join("-")));
};

export const getFavoriteCharacter = async (region: string, characterName: string) => {
  const character = await LocalStorage.getItem<string>([favoriteCharacterPrefix, region, characterName].join("-"));
  return character ? (JSON.parse(character) as CharacterData) : undefined;
};

export const saveCharacterToFavorites = async (character: CharacterData, force?: boolean) => {
  if (!force && (await hasCharacterInFavorites(character))) return;
  await LocalStorage.setItem(
    [favoriteCharacterPrefix, character.Region, character.Name].join("-"),
    JSON.stringify(character),
  );
};

export const removeCharacterFromFavorites = async (character: CharacterData) => {
  await LocalStorage.removeItem([favoriteCharacterPrefix, character.Region, character.Name].join("-"));
};

export const getFavoriteCharacters = async () => {
  const all = await LocalStorage.allItems();
  const favoriteCharacters = Object.entries(all)
    .filter(([key]) => key.startsWith(favoriteCharacterPrefix))
    .map(([, value]) => JSON.parse(value) as CharacterData);
  return favoriteCharacters;
};

export const sortCharacters = (characters: CharacterData[], sortBy: string) => {
  return characters.slice().sort((c1, c2) => {
    if (sortBy === "Level") return c2.Level - c1.Level;
    if (sortBy === "Name") return c1.Name.localeCompare(c2.Name);
    return 0;
  });
};
