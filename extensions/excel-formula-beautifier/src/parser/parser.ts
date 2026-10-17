// Excel Formula Parser - Pure parsing logic

import { FormulaTypes } from "./formula-types";
import {
  ExcelExpression,
  SubExpression,
  FormulaExpr,
  OperatorExpression,
  CellReferenceExpression,
  CellRangeExpression,
} from "./types";

export class ExcelFormulaParser {
  private static readonly formulaTypes: Array<string> = Object.values(FormulaTypes);
  private static readonly formulaTypesMap: Record<string, FormulaTypes> = {
    ...Object.entries(FormulaTypes).reduce(
      (acc, [, value]) => {
        acc[value] = value as FormulaTypes;
        return acc;
      },
      {} as Record<string, FormulaTypes>,
    ),
  };

  // Define operators in order of precedence (longest first to avoid partial matches)
  private static readonly operators: Array<string> = [
    "<=",
    ">=",
    "<>",
    "!=",
    "==",
    "+",
    "-",
    "*",
    "/",
    "^",
    "&",
    "=",
    "<",
    ">",
  ];

  private static findOperatorAt(input: string, position: number): string | null {
    // Check for 2-character operators first
    if (position < input.length - 1) {
      const twoChar = input.substring(position, position + 2);
      if (this.operators.includes(twoChar)) {
        return twoChar;
      }
    }

    // Check for single-character operators
    const oneChar = input.charAt(position);
    if (this.operators.includes(oneChar)) {
      return oneChar;
    }

    return null;
  }

  private static parseCellReference(text: string): CellReferenceExpression | CellRangeExpression | null {
    // Remove any leading/trailing whitespace
    text = text.trim();

    // Check for range (contains :)
    if (text.includes(":")) {
      return this.parseCellRange(text);
    }

    // Parse single cell reference
    return this.parseSingleCellReference(text);
  }

  private static parseCellRange(text: string): CellRangeExpression | null {
    // Split on colon
    const parts = text.split(":");
    if (parts.length !== 2) {
      return null;
    }

    const [startPart, endPart] = parts;
    let sheet: string | undefined;
    let start = startPart;
    const end = endPart;

    // Check if sheet is specified in the start part
    if (start.includes("!")) {
      const sheetSplit = start.split("!");
      sheet = sheetSplit[0].replace(/^'|'$/g, ""); // Remove quotes
      start = sheetSplit[1];
    }

    // Parse start and end cells
    const startCell = this.parseSingleCellReference(start);
    const endCell = this.parseSingleCellReference(end);

    if (!startCell || !endCell) {
      return null;
    }

    return new CellRangeExpression(text, sheet, startCell, endCell);
  }

  private static parseSingleCellReference(text: string): CellReferenceExpression | null {
    // Pattern for cell reference: [Sheet!][$]Column[$]Row
    // Examples: A1, $A1, A$1, $A$1, Sheet1!A1, 'Sheet Name'!$A$1
    const cellPattern = /^(?:([^!]+)!)?(\$?)([A-Z]+)(\$?)(\d+)$/i;
    const match = text.match(cellPattern);

    if (!match) {
      return null;
    }

    const [, sheet, colAbsolute, column, rowAbsolute, row] = match;

    // Clean sheet name (remove quotes if present)
    const cleanSheet = sheet ? sheet.replace(/^'|'$/g, "") : undefined;

    return new CellReferenceExpression(
      text,
      cleanSheet,
      column.toUpperCase(),
      row,
      colAbsolute === "$",
      rowAbsolute === "$",
    );
  }

  private static parseExpressions(
    parent: ExcelExpression,
    startIndex: number,
    input: string,
    separator: string,
  ): number {
    let token = "";
    let i: number = startIndex;
    let inDoubleQuote = false;

    while (i < input.length) {
      const char = input[i];
      const prevChar = i > 0 ? input[i - 1] : "";

      // Handle quotes
      if (char === '"' && prevChar !== "\\") {
        inDoubleQuote = !inDoubleQuote;
        token += char;
        i++;
        continue;
      }

      // Skip operator/special char detection inside quotes
      if (inDoubleQuote) {
        token += char;
        i++;
        continue;
      }

      const operator = this.findOperatorAt(input, i);

      if (char === "(") {
        if (token.trim().length > 0) {
          // Check if token is a function name
          const upperToken = token.trim().toUpperCase();
          if (this.formulaTypes.includes(upperToken)) {
            const formulaType = this.formulaTypesMap[upperToken];
            if (formulaType) {
              i = this.parseFormula(parent, formulaType, i, input, separator);
              token = "";
            }
          } else {
            // Regular token before parentheses
            const cellRef = this.parseCellReference(token.trim());
            if (cellRef) {
              parent.addChild(cellRef);
            } else {
              parent.addChild(new ExcelExpression(token.trim()));
            }
            token = "";
            const expression = new SubExpression("");
            parent.addChild(expression);
            i = this.parseExpressions(expression, i + 1, input, separator);
          }
        } else {
          // Parentheses without preceding token
          const expression = new SubExpression("");
          parent.addChild(expression);
          i = this.parseExpressions(expression, i + 1, input, separator);
        }
      } else if (char === ")") {
        if (token.trim().length > 0) {
          const cellRef = this.parseCellReference(token.trim());
          if (cellRef) {
            parent.addChild(cellRef);
          } else {
            parent.addChild(new ExcelExpression(token.trim()));
          }
        }
        return i;
      } else if (operator) {
        // Found an operator
        if (token.trim().length > 0) {
          const cellRef = this.parseCellReference(token.trim());
          if (cellRef) {
            parent.addChild(cellRef);
          } else {
            parent.addChild(new ExcelExpression(token.trim()));
          }
          token = "";
        }
        parent.addChild(new OperatorExpression(operator));
        i += operator.length - 1; // Skip the operator characters (-1 because i++ will happen)
      } else if (char === " " || char === "\t" || char === "\n") {
        token += char;
      } else {
        token += char;
      }

      i++;
    }

    if (token.trim().length > 0) {
      const cellRef = this.parseCellReference(token.trim());
      if (cellRef) {
        parent.addChild(cellRef);
      } else {
        parent.addChild(new ExcelExpression(token.trim()));
      }
    }

    return i;
  }

  private static parseFormula(
    parent: ExcelExpression,
    formula: FormulaTypes,
    startIndex: number,
    input: string,
    separator: string,
  ): number {
    const formulaExpr = new FormulaExpr("", formula);
    parent.addChild(formulaExpr);

    let i = this.parserAdvanceTo("(", startIndex, input);
    let token = "";
    let braceCount = 0;

    while (i < input.length) {
      if (input[i] === separator && braceCount === 0) {
        if (token.trim().length > 0) {
          const paramExpression = new ExcelExpression(token.trim());
          this.parseExpressions(paramExpression, 0, token, separator);

          if (paramExpression.getChilds().length === 1) {
            formulaExpr.addChild(paramExpression.getChilds()[0]);
          } else if (paramExpression.getChilds().length > 1) {
            formulaExpr.addChild(paramExpression);
          } else {
            // No children found, try to parse as cell reference or add as simple expression
            const cellRef = this.parseCellReference(token.trim());
            if (cellRef) {
              formulaExpr.addChild(cellRef);
            } else {
              formulaExpr.addChild(new ExcelExpression(token.trim()));
            }
          }
        }
        token = "";
      } else {
        if (input[i] === "(") {
          braceCount++;
        } else if (input[i] === ")") {
          braceCount--;
        }

        if (braceCount < 0) {
          // End of function parameters
          if (token.trim().length > 0) {
            const paramExpression = new ExcelExpression(token.trim());
            this.parseExpressions(paramExpression, 0, token, separator);

            if (paramExpression.getChilds().length === 1) {
              formulaExpr.addChild(paramExpression.getChilds()[0]);
            } else if (paramExpression.getChilds().length > 1) {
              formulaExpr.addChild(paramExpression);
            } else {
              // No children found, try to parse as cell reference or add as simple expression
              const cellRef = this.parseCellReference(token.trim());
              if (cellRef) {
                formulaExpr.addChild(cellRef);
              } else {
                formulaExpr.addChild(new ExcelExpression(token.trim()));
              }
            }
          }
          return i;
        }

        token += input[i];
      }
      i++;
    }

    // If we reach here, the function was not properly closed
    throw new Error(`Function ${formula} is missing closing parenthesis`);
  }

  private static parserAdvanceTo(char: string, startIndex: number, input: string): number {
    let i = startIndex;
    while (i < input.length && input[i] !== char) {
      i++;
    }
    return i + 1; // Move past the found character
  }

  private static validateFormula(formula: string): void {
    // Check for balanced parentheses
    let parenCount = 0;
    let inSingleQuote = false;
    let inDoubleQuote = false;

    for (let i = 0; i < formula.length; i++) {
      const char = formula[i];
      const prevChar = i > 0 ? formula[i - 1] : "";

      // Handle quotes (ignore escaped quotes)
      if (char === "'" && prevChar !== "\\") {
        inSingleQuote = !inSingleQuote;
        continue;
      }
      if (char === '"' && prevChar !== "\\") {
        inDoubleQuote = !inDoubleQuote;
        continue;
      }

      // Skip parentheses inside quotes
      if (inSingleQuote || inDoubleQuote) {
        continue;
      }

      if (char === "(") {
        parenCount++;
      } else if (char === ")") {
        parenCount--;
        if (parenCount < 0) {
          throw new Error("Unexpected closing parenthesis ')'");
        }
      }
    }

    // Check for unclosed quotes
    if (inSingleQuote) {
      throw new Error("Unclosed single quote in formula");
    }
    if (inDoubleQuote) {
      throw new Error("Unclosed double quote in formula");
    }

    // Check for unmatched parentheses
    if (parenCount > 0) {
      throw new Error(`Missing ${parenCount} closing parenthesis${parenCount > 1 ? "es" : ""} ')'`);
    }

    // Check for trailing operators
    const trimmed = formula.trim();
    if (trimmed.length > 0) {
      const lastChar = trimmed[trimmed.length - 1];
      if (["+", "-", "*", "/", "=", "<", ">", "&"].includes(lastChar)) {
        throw new Error(`Formula cannot end with operator '${lastChar}'`);
      }
    }

    // Check for empty parentheses in functions
    const emptyParenPattern = /[A-Z][A-Z0-9_]*\(\s*\)/gi;
    if (emptyParenPattern.test(formula)) {
      const match = formula.match(/([A-Z][A-Z0-9_]*)\(\s*\)/gi);
      if (match) {
        throw new Error(`Function ${match[0].replace("()", "")} has empty parentheses`);
      }
    }
  }

  static parse(formula: string): ExcelExpression {
    // Remove leading = if present
    let cleanFormula = formula.trim();
    if (cleanFormula.startsWith("=")) {
      cleanFormula = cleanFormula.substring(1);
    }

    // Validate formula syntax before parsing
    this.validateFormula(cleanFormula);

    // Determine separator (European uses ; US uses ,)
    const separator = cleanFormula.includes(";") ? ";" : ",";

    try {
      const baseExpression = new ExcelExpression(cleanFormula);
      this.parseExpressions(baseExpression, 0, cleanFormula, separator);

      return baseExpression;
    } catch (error) {
      // Re-throw validation errors with better messages
      if (error instanceof Error) {
        throw new Error(error.message);
      }
      throw new Error("Invalid formula syntax");
    }
  }
}
