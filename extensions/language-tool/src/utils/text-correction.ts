import type { CheckTextResponse } from "../types";

/**
 * Calcula o texto corrigido aplicando as sugestões especificadas
 *
 * Função pura - pode ser usada em qualquer contexto (hooks, comandos async, etc)
 *
 * @param textChecked - Texto original
 * @param result - Resposta da API com os matches
 * @param appliedIndexes - Set de índices das sugestões a aplicar
 * @returns Texto com correções aplicadas
 */
export function calculateCorrectedText(
  textChecked: string,
  result: CheckTextResponse,
  appliedIndexes: Set<number>,
): string {
  if (!result.matches || appliedIndexes.size === 0) {
    return textChecked;
  }

  let text = textChecked;
  let offset = 0;

  // Aplica as correções em ordem
  const sortedMatches = result.matches
    .filter((_, index) => appliedIndexes.has(index))
    .sort((a, b) => a.offset - b.offset);

  for (const match of sortedMatches) {
    const replacement = match.replacements[0]?.value || "";
    const start = match.offset + offset;
    const end = start + match.length;

    text = text.slice(0, start) + replacement + text.slice(end);
    offset += replacement.length - match.length;
  }

  return text;
}

/**
 * Aplica TODAS as correções de uma resposta da API
 *
 * @param textChecked - Texto original
 * @param result - Resposta da API
 * @returns Texto completamente corrigido
 */
export function applyAllCorrections(textChecked: string, result: CheckTextResponse): string {
  if (!result.matches || result.matches.length === 0) {
    return textChecked;
  }

  // Cria set com todos os índices
  const allIndexes = new Set(result.matches.map((_, index) => index));

  return calculateCorrectedText(textChecked, result, allIndexes);
}
