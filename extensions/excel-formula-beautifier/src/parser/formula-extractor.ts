import { ExcelExpression, FormulaExpr } from "./types";
import { getFormulaDoc } from "./formulas-documentation";

export interface ExtractedFormula {
  name: string;
  doc?: ReturnType<typeof getFormulaDoc>;
  count: number;
}

export function extractFormulasFromExpression(expression: ExcelExpression): ExtractedFormula[] {
  const formulasMap = new Map<string, ExtractedFormula>();

  function traverse(expr: ExcelExpression) {
    if (expr instanceof FormulaExpr) {
      const formulaName = expr.formula;
      const doc = getFormulaDoc(formulaName);

      if (formulasMap.has(formulaName)) {
        const existing = formulasMap.get(formulaName)!;
        existing.count++;
      } else {
        formulasMap.set(formulaName, {
          name: formulaName,
          doc,
          count: 1,
        });
      }
    }

    // Recursively traverse children
    for (const child of expr.getChilds()) {
      traverse(child);
    }
  }

  traverse(expression);

  // Sort by count (descending) then by name
  return Array.from(formulasMap.values()).sort((a, b) => {
    if (b.count !== a.count) {
      return b.count - a.count;
    }
    return a.name.localeCompare(b.name);
  });
}
