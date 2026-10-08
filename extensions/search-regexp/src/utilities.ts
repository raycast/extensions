import { nanoid } from "nanoid";
import { Category, ExpressionItem, MappedExpression } from "./types";

function capitalize(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
}

export function capitalizeSentence(sentence: string): string {
  return sentence.split(" ").map(capitalize).join(" ");
}

export function ellipsis(str: string, maxLength = 25): string {
  return (str ?? "").length >= maxLength ? `${str.slice(0, maxLength)}...` : str;
}

function processExpressionVariations(expressionItem: ExpressionItem): MappedExpression[] {
  return expressionItem.variations.map(({ name, regexp, link }) => ({
    name,
    regexp,
    link,
    category: expressionItem.category,
    displayName: expressionItem.displayName,
    id: nanoid(5),
  }));
}

export function flatExpressions(expressions: ExpressionItem[]): {
  zipCodesExpressions: MappedExpression[];
  defaultExpressions: MappedExpression[];
  regexpCategories: Category[];
} {
  let defaultExpressions: MappedExpression[] = [];
  let zipCodesExpressions: MappedExpression[] = [];
  const categories: Category[] = [];

  for (const expression of expressions) {
    categories.push({
      shortname: expression.category,
      displayName: expression.displayName,
    });
    if (expression.category !== "zipcode") {
      defaultExpressions = [...defaultExpressions, ...processExpressionVariations(expression)];
    } else {
      zipCodesExpressions = [...zipCodesExpressions, ...processExpressionVariations(expression)];
    }
  }

  if (zipCodesExpressions.length) {
    defaultExpressions = [
      ...defaultExpressions,
      ...[
        {
          name: "Zip Codes",
          category: "zipcode",
          displayName: "Zip Codes",
          id: nanoid(5),
        },
      ],
    ];
  }
  return {
    defaultExpressions,
    zipCodesExpressions,
    regexpCategories: [
      {
        shortname: "all",
        displayName: "All",
      },
      ...categories,
    ],
  };
}
