// Core types and interfaces for Excel Formula Parser

import { FormulaTypes } from "./formula-types";

export class ExcelExpression {
  readonly original: string;
  private childs: Array<ExcelExpression> = [];

  constructor(original: string) {
    this.original = original;
  }

  addChild(child: ExcelExpression): void {
    this.childs.push(child);
  }

  getChilds(): Array<ExcelExpression> {
    return this.childs;
  }

  replaceChildren(newChildren: Array<ExcelExpression>): void {
    // TODO find a way not to have this.
    this.childs = newChildren;
  }
}

export class SubExpression extends ExcelExpression {}

export class FormulaExpr extends ExcelExpression {
  readonly formula: FormulaTypes;

  constructor(original: string, formula: FormulaTypes) {
    super(original);
    this.formula = formula;
  }
}

export class SimpleExpression extends ExcelExpression {}

export class OperatorExpression extends ExcelExpression {
  readonly operator: string;

  constructor(operator: string) {
    super(operator);
    this.operator = operator;
  }
}

export class CellReferenceExpression extends ExcelExpression {
  readonly sheet?: string; // Sheet name (e.g., "Sheet1" in "Sheet1!A1")
  readonly column: string; // Column letter(s) (e.g., "A", "AB")
  readonly row: string; // Row number (e.g., "1", "100")
  readonly isColumnAbsolute: boolean; // True if column has $ (e.g., "$A1")
  readonly isRowAbsolute: boolean; // True if row has $ (e.g., "A$1")

  constructor(
    original: string,
    sheet: string | undefined,
    column: string,
    row: string,
    isColumnAbsolute: boolean,
    isRowAbsolute: boolean,
  ) {
    super(original);
    this.sheet = sheet;
    this.column = column;
    this.row = row;
    this.isColumnAbsolute = isColumnAbsolute;
    this.isRowAbsolute = isRowAbsolute;
  }

  getFullReference(): string {
    const sheetPrefix = this.sheet ? `${this.sheet}!` : "";
    const colPrefix = this.isColumnAbsolute ? "$" : "";
    const rowPrefix = this.isRowAbsolute ? "$" : "";
    return `${sheetPrefix}${colPrefix}${this.column}${rowPrefix}${this.row}`;
  }
}

export class CellRangeExpression extends ExcelExpression {
  readonly sheet?: string; // Sheet name if specified
  readonly startCell: CellReferenceExpression;
  readonly endCell: CellReferenceExpression;

  constructor(
    original: string,
    sheet: string | undefined,
    startCell: CellReferenceExpression,
    endCell: CellReferenceExpression,
  ) {
    super(original);
    this.sheet = sheet;
    this.startCell = startCell;
    this.endCell = endCell;
  }

  getFullReference(): string {
    const sheetPrefix = this.sheet ? `${this.sheet}!` : "";
    return `${sheetPrefix}${this.startCell.getFullReference().replace(/^.*!/, "")}:${this.endCell.getFullReference().replace(/^.*!/, "")}`;
  }
}

export interface FormattingOptions {
  useNestingIndicators?: boolean;
  useOperatorSpacing?: boolean;
  indentSize?: number;
  maxInlineLength?: number;
  maxInlineParams?: number;
}

export const DEFAULT_FORMATTING_OPTIONS: FormattingOptions = {
  useNestingIndicators: true,
  useOperatorSpacing: true,
  indentSize: 4,
  maxInlineLength: 40,
  maxInlineParams: 3,
};
