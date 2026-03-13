import { DrinkCompleteInfo } from "../types";

export default function generateDrinkMarkdown(drink: DrinkCompleteInfo) {
  return `## Instructions

${drink.strInstructions}

| Ingredient | Measure |
|------------|---------|
${Array.from({ length: 15 }, (_, i) => i + 1)
  .map((i) => {
    const ingredient = drink[`strIngredient${i}` as keyof typeof drink];
    const measure = drink[`strMeasure${i}` as keyof typeof drink] || "-";
    if (ingredient) return `| ${ingredient} | ${measure} |`;
  })
  .join(`\n`)}

----
![${drink.strDrink}](${drink.strDrinkThumb})`;
}
