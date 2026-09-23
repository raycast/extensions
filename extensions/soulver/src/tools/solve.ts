import { evaluateExpression } from "../utils/soulver-cli";

type Input = {
  /** The mathematical, currency, unit, date, or natural language expression to evaluate */
  expression: string;
};

/**
 * Evaluates an expression using Soulver CLI.
 */
export default async function tool(input: Input) {
  if (!input.expression) {
    throw new Error("Expression is required");
  }
  return await evaluateExpression(input.expression);
}
