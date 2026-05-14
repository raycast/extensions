import { closeMainWindow, showHUD, showToast, Toast } from "@raycast/api";
import { getDefaultLayout } from "./defaults";
import { getLayout, getLayouts } from "./storage";
import { LayoutPreset } from "./types";
import { applyLayoutToFocusedWindow } from "./window";

export async function runLayout(layoutId: string) {
  const layout = (await getLayout(layoutId)) ?? getDefaultLayout(layoutId);

  if (!layout) {
    await showToast({ style: Toast.Style.Failure, title: "Layout Not Found" });
    return;
  }

  try {
    await closeMainWindow({ clearRootSearch: true });
    await waitForFocusToReturn();
    await applyLayoutToFocusedWindow(layout);
    await showHUD(`Applied ${layout.name}`);
  } catch (error) {
    await showToast({
      style: Toast.Style.Failure,
      title: "Could Not Apply Layout",
      message: error instanceof Error ? error.message : "Unknown error",
    });
  }
}

export async function runBestMatchingLayout(query: string) {
  const layouts = await getLayouts();
  const match = findBestMatchingLayout(layouts, query);

  if (!match) {
    await showToast({
      style: Toast.Style.Failure,
      title: "Layout Not Found",
      message: `No layout matched "${query}".`,
    });
    return;
  }

  await applyLayout(match, `Applied ${match.name}`);
}

async function applyLayout(layout: LayoutPreset, successMessage: string) {
  try {
    await closeMainWindow({ clearRootSearch: true });
    await waitForFocusToReturn();
    await applyLayoutToFocusedWindow(layout);
    await showHUD(successMessage);
  } catch (error) {
    await showToast({
      style: Toast.Style.Failure,
      title: "Could Not Apply Layout",
      message: error instanceof Error ? error.message : "Unknown error",
    });
  }
}

function findBestMatchingLayout(layouts: LayoutPreset[], query: string) {
  const normalizedQuery = normalizeSearchValue(query);

  if (!normalizedQuery) {
    return undefined;
  }

  const scoredLayouts = layouts
    .map((layout) => ({ layout, score: scoreLayoutMatch(layout.name, normalizedQuery) }))
    .filter((item) => item.score > 0)
    .sort((first, second) => second.score - first.score || first.layout.name.localeCompare(second.layout.name));

  return scoredLayouts[0]?.layout;
}

function scoreLayoutMatch(name: string, normalizedQuery: string) {
  const normalizedName = normalizeSearchValue(name);

  if (normalizedName === normalizedQuery) {
    return 1000;
  }

  if (normalizedName.startsWith(normalizedQuery)) {
    return 900 - Math.abs(normalizedName.length - normalizedQuery.length);
  }

  if (normalizedName.includes(normalizedQuery)) {
    return 800 - normalizedName.indexOf(normalizedQuery);
  }

  if (isSubsequence(normalizedQuery, normalizedName)) {
    return 650 - Math.abs(normalizedName.length - normalizedQuery.length);
  }

  const distance = levenshteinDistance(normalizedName, normalizedQuery);
  const maxLength = Math.max(normalizedName.length, normalizedQuery.length);
  const similarity = 1 - distance / maxLength;

  return similarity >= 0.58 ? Math.round(similarity * 600) : 0;
}

function normalizeSearchValue(value: string) {
  return value.toLocaleLowerCase().replace(/[^a-z0-9]/g, "");
}

function isSubsequence(needle: string, haystack: string) {
  let index = 0;

  for (const character of haystack) {
    if (character === needle[index]) {
      index += 1;
    }
  }

  return index === needle.length;
}

function levenshteinDistance(firstValue: string, secondValue: string) {
  const previousRow = Array.from({ length: secondValue.length + 1 }, (_, index) => index);
  const currentRow = Array.from({ length: secondValue.length + 1 }, () => 0);

  for (let firstIndex = 1; firstIndex <= firstValue.length; firstIndex += 1) {
    currentRow[0] = firstIndex;

    for (let secondIndex = 1; secondIndex <= secondValue.length; secondIndex += 1) {
      const substitutionCost = firstValue[firstIndex - 1] === secondValue[secondIndex - 1] ? 0 : 1;
      currentRow[secondIndex] = Math.min(
        currentRow[secondIndex - 1] + 1,
        previousRow[secondIndex] + 1,
        previousRow[secondIndex - 1] + substitutionCost,
      );
    }

    previousRow.splice(0, previousRow.length, ...currentRow);
  }

  return previousRow[secondValue.length];
}

function waitForFocusToReturn() {
  return new Promise((resolve) => setTimeout(resolve, 180));
}
