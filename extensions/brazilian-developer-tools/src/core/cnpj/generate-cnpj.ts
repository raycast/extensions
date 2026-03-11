import { calcCheckDigits } from "./utils/calc-check-digts";
import { formatCNPJ } from "./utils/format-cnpj";
import { generateCharacters } from "./utils/generate-characters";

/**
 * Generates a valid CNPJ (Cadastro Nacional da Pessoa Jurídica) number.
 * @param [params]         - Options for CNPJ generation.
 * @param [params.format] - If true, the generated CNPJ will be formatted (e.g., 00.000.000/0000-00).
 * @param [params.alphanumeric] - If true, will generated an alphanumeric CNPJ.
 * @returns                 The generated CNPJ number, optionally formatted.
 */
export const generateCnpj = ({
  format,
  alphanumeric = false,
}: {
  format?: boolean;
  alphanumeric?: boolean;
} = {}): string => {
  const firstTwelveDigits = generateCharacters(alphanumeric);

  const checkDigits = calcCheckDigits(firstTwelveDigits);
  const generatedCNPJ = `${firstTwelveDigits}${checkDigits}`;

  return format ? formatCNPJ(generatedCNPJ) : generatedCNPJ;
};
