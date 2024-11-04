import { TorrentCategories, TorrentCategoryTitlesWithCodes } from "./src/models/torrent-categories";
import { writeFileSync } from "fs";

export const getCategoriesPreferences = () => {
  return Object.entries(TorrentCategories).map(([key, value], index) => ({
    name: key,
    title: index === 0 ? "Select search categories" : "",
    label: TorrentCategoryTitlesWithCodes[value],
    type: "checkbox",
    description: "Select necessary search categories",
    required: false,
  }));
};

const generateCategoriesToFile = () => {
  const categories = getCategoriesPreferences();

  const categoriesFilePath = "./generated-categories.json";

  writeFileSync(categoriesFilePath, JSON.stringify(categories, null, 2));
  console.log("Categories populated successfully into categories.json.");
};

generateCategoriesToFile();
