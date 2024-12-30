import type { GetOperation } from "#/operations";
import { parseOptions } from "./parseOptions";

export function parseInput(input: string, getOperation: GetOperation) {
  const operationTexts = input.trim().split(/\s*\|\s*/);
  return operationTexts.map((text) => parseOperation(text, getOperation));
}

function parseOperation(operationText: string, getOperation: GetOperation) {
  const [name, ...optionTexts] = operationText.split(/\s+/);
  const { run, format } = getOperation(name);
  const optionText = optionTexts.join(" ");
  return {
    name,
    run,
    options: parseOptions(optionText, format),
  };
}
