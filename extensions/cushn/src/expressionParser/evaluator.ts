import { ParseError, type AstNode } from "./types";

export function evaluate(node: AstNode): number {
  if (node.kind === "number") return node.value;

  const left = evaluate(node.left);
  const right = evaluate(node.right);
  switch (node.op) {
    case "+":
      return left + right;
    case "-":
      return left - right;
    case "*":
      return left * right;
    case "/":
      if (right === 0) throw new ParseError("Division by zero");
      return left / right;
  }
}
