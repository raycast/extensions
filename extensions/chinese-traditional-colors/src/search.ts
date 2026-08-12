import { hexToRgb } from "./color-format";
import type { TraditionalColor } from "./types";

const hueCategoryOrder = ["中性色", "橙色系", "红色系", "紫色系", "绿色系", "蓝色系", "青色系", "黄色系"];

function hueCategoryIndex(category: string): number {
  const index = hueCategoryOrder.indexOf(category);
  return index === -1 ? hueCategoryOrder.length : index;
}

export function getSearchKeywords(color: TraditionalColor): string[] {
  const { r, g, b } = hexToRgb(color.hex);
  const paletteKeywords = Object.values(color.palettes)
    .flat()
    .flatMap((reference) => [
      reference.number,
      reference.name,
      reference.hex.toLowerCase(),
      reference.hex.slice(1).toLowerCase(),
    ]);

  return [
    color.number,
    color.name,
    color.pinyin,
    color.pinyinCompact,
    color.hex.toLowerCase(),
    color.hex.slice(1).toLowerCase(),
    color.hueCategory,
    color.temperature,
    String(r),
    String(g),
    String(b),
    String(color.hsl.h),
    String(color.hsl.s),
    String(color.hsl.l),
    ...paletteKeywords,
  ];
}

export function filterColors(colors: TraditionalColor[], query: string, hueCategory: string): TraditionalColor[] {
  const normalizedQuery = query.trim().toLowerCase();

  return colors.filter((color) => {
    if (hueCategory !== "all" && color.hueCategory !== hueCategory) return false;
    if (!normalizedQuery) return true;
    return getSearchKeywords(color).some((keyword) => keyword.toLowerCase().includes(normalizedQuery));
  });
}

export function sortColorsByHueCategory(colors: TraditionalColor[]): TraditionalColor[] {
  return [...colors].sort((left, right) => {
    const categoryDifference = hueCategoryIndex(left.hueCategory) - hueCategoryIndex(right.hueCategory);
    if (categoryDifference !== 0) return categoryDifference;
    return Number(left.number) - Number(right.number);
  });
}

export function getHueCategories(colors: TraditionalColor[]): string[] {
  return Array.from(new Set(colors.map((color) => color.hueCategory))).sort((left, right) => {
    const categoryDifference = hueCategoryIndex(left) - hueCategoryIndex(right);
    if (categoryDifference !== 0) return categoryDifference;
    return left.localeCompare(right);
  });
}
