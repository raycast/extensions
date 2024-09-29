import { TERMINAL_TYPES } from "./constants";
import fs from "fs";
import type { Category } from "./types";

export const getAvailableActions = () => {
  const availableActions: string[] = [];

  Object.keys(TERMINAL_TYPES).forEach((key) => {
    if (fs.existsSync(`/Applications/${key}.app`) || key === "terminal") {
      availableActions.push(key);
    }
  });

  return availableActions;
};

export const getCategories = (cmd: string, recentlyUsed: string[], history: string[] | undefined) => {
  const categories: Category[] = [];

  if (cmd) {
    categories.push({
      category: "New command",
      items: [cmd],
    });
  }

  if (recentlyUsed.length > 0) {
    categories.push({
      category: "Raycast History",
      items: recentlyUsed.filter((item) => item.includes(cmd)).slice(0, 50),
    });
  }

  if (history !== undefined && history.length > 0) {
    categories.push({
      category: "Bash History",
      items: history.filter((item) => item.includes(cmd)).slice(0, 50),
    });
  }

  return categories;
};
