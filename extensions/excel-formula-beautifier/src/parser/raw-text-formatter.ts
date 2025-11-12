// Excel Formula Formatter - Pure text formatting logic

import {
  ExcelExpression,
  SubExpression,
  FormulaExpr,
  OperatorExpression,
  CellReferenceExpression,
  CellRangeExpression,
  FormattingOptions,
  DEFAULT_FORMATTING_OPTIONS,
} from "./types";

export class ExcelRawTextFormatter {
  private options: FormattingOptions;

  constructor(options: Partial<FormattingOptions> = {}) {
    this.options = { ...DEFAULT_FORMATTING_OPTIONS, ...options };
  }

  format(expression: ExcelExpression, hasEqualsSign: boolean = false): string {
    const result = this.prettyPrint(expression, 0);
    return (hasEqualsSign ? "=" : "") + result;
  }

  private prettyPrint(expression: ExcelExpression, depth: number): string {
    const children = expression.getChilds();

    // If no children, return the original content
    if (children.length === 0) {
      return expression.original || "";
    }

    let result = "";

    for (let i = 0; i < children.length; i++) {
      const child = children[i];

      if (child instanceof FormulaExpr) {
        result += this.formatFunction(child, depth);
      } else if (child instanceof SubExpression) {
        result += this.formatSubExpression(child, depth);
      } else if (child instanceof OperatorExpression) {
        result += this.formatOperator(child, i, children);
      } else if (child instanceof CellReferenceExpression) {
        result += this.formatCellReference(child);
      } else if (child instanceof CellRangeExpression) {
        result += this.formatCellRange(child);
      } else {
        // For regular expressions, check if they have children or use original
        if (child.getChilds().length === 0) {
          result += child.original || "";
        } else {
          result += this.prettyPrint(child, depth);
        }
      }
    }

    return result;
  }

  private formatFunction(func: FormulaExpr, depth: number): string {
    const params = func.getChilds();
    if (params.length === 0) {
      return func.formula + "()";
    }

    // Check if this function should be formatted inline
    if (this.shouldFormatInline(func)) {
      let result = func.formula + "(";
      for (let i = 0; i < params.length; i++) {
        const param = params[i];
        const isLast = i === params.length - 1;

        if (param instanceof FormulaExpr && this.shouldFormatInline(param)) {
          result += this.formatFunction(param, depth + 1);
        } else if (param instanceof SubExpression) {
          result += this.formatSubExpression(param, depth);
        } else {
          const paramContent = param.getChilds().length === 0 ? param.original || "" : this.prettyPrint(param, depth);
          result += paramContent || "";
        }

        if (!isLast) {
          result += "; ";
        }
      }
      result += ")";
      return result;
    }

    // Multi-line formatting for complex functions
    let result = func.formula + "(\n";

    for (let i = 0; i < params.length; i++) {
      const param = params[i];
      const isLast = i === params.length - 1;

      // Add indentation and nesting indicator for parameters
      result += this.indent(depth + 1);
      if (this.options.useNestingIndicators) {
        result += this.getNestingIndicator(depth + 1, isLast);
      }

      if (param instanceof FormulaExpr) {
        // For nested functions, don't add extra indicator since formatFunction will handle it
        const functionResult = this.formatFunction(param, depth + 1);
        result += functionResult;
      } else if (param instanceof SubExpression) {
        const subResult = this.formatSubExpression(param, depth + 1);
        result += subResult;
      } else {
        // For parameter content, preserve original or format children
        const paramContent = param.getChilds().length === 0 ? param.original || "" : this.prettyPrint(param, depth + 1);
        result += paramContent || "";
      }

      if (!isLast) {
        result += ";";
      }
      result += "\n";
    }

    result += this.indent(depth) + ")";
    return result;
  }

  private shouldFormatInline(func: FormulaExpr): boolean {
    const params = func.getChilds();

    // No parameters or only one parameter
    if (params.length === 0 || params.length === 1) {
      // Check if the single parameter is simple
      if (params.length === 1) {
        const param = params[0];
        // If it's a nested function, don't inline
        if (param instanceof FormulaExpr) {
          return false;
        }
        // If it's a complex sub-expression, don't inline
        if (param instanceof SubExpression && this.containsFunction(param)) {
          return false;
        }
        // Check the content length
        const content = param.original || this.prettyPrint(param, 0);
        return content.length <= 30;
      }
      return true;
    }

    // Multiple parameters - only inline if all are very simple and short
    if (params.length <= (this.options.maxInlineParams || 3)) {
      let totalLength = 0;
      for (const param of params) {
        if (param instanceof FormulaExpr || (param instanceof SubExpression && this.containsFunction(param))) {
          return false;
        }
        const content = param.original || this.prettyPrint(param, 0);
        totalLength += content.length;
        if (totalLength > (this.options.maxInlineLength || 40)) {
          return false;
        }
      }
      return totalLength <= (this.options.maxInlineLength || 40);
    }

    return false;
  }

  private formatSubExpression(subExpr: SubExpression, depth: number): string {
    const content = this.prettyPrint(subExpr, depth);

    // If it's simple, keep on one line
    if (!content.includes("\n") && content.length < 50 && !this.containsFunction(subExpr)) {
      return "(" + content + ")";
    }

    // Complex sub-expression gets multi-line formatting
    return "(\n" + this.indent(depth + 1) + content + "\n" + this.indent(depth) + ")";
  }

  private formatOperator(operator: OperatorExpression, index: number, siblings: ExcelExpression[]): string {
    if (!this.options.useOperatorSpacing) {
      return operator.operator;
    }

    const op = operator.operator;
    let result = "";

    // Add space before operator (except for certain cases)
    const prevSibling = index > 0 ? siblings[index - 1] : null;

    const shouldSpaceBefore = this.shouldSpaceBeforeOperator(op, prevSibling);
    const shouldSpaceAfter = this.shouldSpaceAfterOperator(op);

    if (shouldSpaceBefore) {
      result += " ";
    }

    result += op;

    if (shouldSpaceAfter) {
      result += " ";
    }

    return result;
  }

  private shouldSpaceBeforeOperator(operator: string, prevSibling: ExcelExpression | null): boolean {
    // Don't space before minus if it's at start or likely a negative number
    if (operator === "-") {
      if (!prevSibling) return false; // Beginning of expression
      if (prevSibling instanceof OperatorExpression) {
        const prevOp = prevSibling.operator;
        // After another operator, likely unary minus
        if (["+", "-", "*", "/", "^", "=", "<", ">", "<=", ">=", "<>", "!=", "==", "("].includes(prevOp)) {
          return false;
        }
      }
    }

    // Don't space around colon in ranges (A1:B10)
    if (operator === ":") {
      return false;
    }

    return true;
  }

  private shouldSpaceAfterOperator(operator: string): boolean {
    // Don't space around colon in ranges (A1:B10)
    if (operator === ":") {
      return false;
    }

    return true;
  }

  private formatCellReference(cellRef: CellReferenceExpression): string {
    // Use the built-in method to get properly formatted reference
    return cellRef.getFullReference();
  }

  private formatCellRange(cellRange: CellRangeExpression): string {
    // Use the built-in method to get properly formatted range
    return cellRange.getFullReference();
  }

  private containsFunction(expr: ExcelExpression): boolean {
    if (expr instanceof FormulaExpr) {
      return true;
    }
    return expr.getChilds().some((child) => this.containsFunction(child));
  }

  private needsSpacing(current: ExcelExpression, next: ExcelExpression): boolean {
    if (current instanceof FormulaExpr || next instanceof FormulaExpr) {
      return false; // Functions handle their own spacing
    }

    if (current instanceof OperatorExpression || next instanceof OperatorExpression) {
      return false; // Operators handle their own spacing
    }

    return false; // Let operators handle all spacing needs
  }

  private indent(depth: number): string {
    const indentChar = " ".repeat(this.options.indentSize || 4);
    return indentChar.repeat(depth);
  }

  private getNestingIndicator(depth: number, isLast: boolean = false): string {
    if (depth === 0) return "";

    // Create a simple but consistent nesting indicator
    const prefix = "  ".repeat(Math.max(0, depth - 1)); // 2 spaces per level

    if (depth === 1) {
      return isLast ? "└─ " : "├─ ";
    } else {
      return prefix + (isLast ? "└─ " : "├─ ");
    }
  }
}
