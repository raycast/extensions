import { calcCheckDigits } from "./utils/calc-check-digts";
import { formatCPF } from "./utils/format-cpf";
import { generateDigits } from "./utils/generate-digts";

/**
 * Generates a valid CPF (Cadastro de Pessoas Físicas) number.
 * @param [params]         - Options for CPF generation.
 * @param [params.format] - If true, the generated CPF will be formatted with dots and a dash (e.g., 123.456.789-09).
 * @returns                 The generated CPF number, optionally formatted.
 */
export const generateCpf = (params?: { format: boolean }): string => {
  const firstNineDigits = generateDigits();

  const generatedCPF = `${firstNineDigits}${calcCheckDigits(firstNineDigits)}`;

  return params?.format ? formatCPF(generatedCPF) : generatedCPF;
};
