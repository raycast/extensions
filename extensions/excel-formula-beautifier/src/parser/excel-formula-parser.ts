// Excel Formula Parser and Beautifier - Main Entry Point

import { ExcelFormulaParser } from "./parser";
import { ExcelRawTextFormatter } from "./raw-text-formatter";
import { FormattingOptions } from "./types";

export class ExcelFormulaBeautifier {
  static rawText(formula: string, options?: Partial<FormattingOptions>): string {
    // Parse the formula - let errors bubble up to the caller
    const hasEquals = formula.trim().startsWith("=");
    const parsedExpression = ExcelFormulaParser.parse(formula);

    // Format the parsed expression
    const formatter = new ExcelRawTextFormatter(options);
    return formatter.format(parsedExpression, hasEquals);
  }
}
