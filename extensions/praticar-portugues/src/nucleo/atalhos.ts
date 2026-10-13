import { Keyboard } from "@raycast/api";

/**
 * Todo atalho é declarado por plataforma. Um `{ modifiers: ["cmd"] }` solto
 * funciona no Mac e some no Windows — o linter do Raycast avisa, e ele tem
 * razão: esta extensão é usada nos dois.
 */
function porPlataforma(
  mac: Keyboard.KeyModifier[],
  windows: Keyboard.KeyModifier[],
  key: Keyboard.KeyEquivalent,
): Keyboard.Shortcut {
  return { macOS: { modifiers: mac, key }, Windows: { modifiers: windows, key } };
}

export const ATALHOS = {
  pular: porPlataforma(["cmd"], ["ctrl"], "enter"),
  encerrar: porPlataforma(["cmd"], ["ctrl"], "e"),
  novaSessao: Keyboard.Shortcut.Common.Refresh,
  recarregar: Keyboard.Shortcut.Common.Refresh,
  copiarPalavra: Keyboard.Shortcut.Common.Copy,
  copiarVerbete: porPlataforma(["cmd", "opt"], ["ctrl", "alt"], "c"),
  copiarExemplo: porPlataforma(["cmd", "shift"], ["ctrl", "shift"], "e"),
  copiarRelatorio: Keyboard.Shortcut.Common.Copy,
  vocabulario: porPlataforma(["cmd", "shift"], ["ctrl", "shift"], "v"),
  progresso: porPlataforma(["cmd", "shift"], ["ctrl", "shift"], "p"),
  dominar: porPlataforma(["cmd", "shift"], ["ctrl", "shift"], "d"),
  esquecer: Keyboard.Shortcut.Common.Remove,
  zerarTudo: Keyboard.Shortcut.Common.RemoveAll,
} as const;
