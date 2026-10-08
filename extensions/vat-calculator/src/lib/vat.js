import { getPreferenceValues } from "@raycast/api";

const vat = Number(getPreferenceValues().vat.replace(/%/g, ""));

function equationToNumber(equation) {
  try {
    if (equation.match(/[a-zA-Z]/g) != null) {
      return 0;
    }
    return safeEval(equation);
  } catch {
    return 0;
  }
}

function safeEval(code) {
  return Function(`return ${code}`)();
}

export function getVAT(number, keepAsNumber) {
  number = equationToNumber(number);
  if (keepAsNumber) {
    return (vat / 100) * number;
  }
  return ((vat / 100) * number).toFixed(2);
}

export function numberWithVAT(number) {
  return (getVAT(number, vat, true) + equationToNumber(number)).toFixed(2);
}

export function getNetPrice(number) {
  number = equationToNumber(number);
  return (number / (1 + vat / 100)).toFixed(2);
}
