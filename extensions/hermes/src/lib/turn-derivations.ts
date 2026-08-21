import { turnAppearance, turnMarkdown, turnTitle, type Turn, type TurnMode } from "./turns";

export interface DerivedTurn {
  markdown: string;
  title: string;
  appearance: ReturnType<typeof turnAppearance>;
  usedTools: string[];
}

type DerivationEntry = { turn: Turn; revision?: number; mode: TurnMode; thinking: boolean; value: DerivedTurn };

export interface TurnDerivationCache {
  get(turn: Turn, mode: TurnMode, thinking: boolean): DerivedTurn;
  clear(): void;
}

/**
 * O limite de 128 fica ABAIXO da janela maxima que o desenho permite: `renderCap` comeca em
 * 40 e cresce +40 a cada `Carregar parte anterior`, entao 160 trocas na tela e alcancavel.
 * Acima de 128 cada render evita a entrada que acabou de usar e todas recalculam.
 *
 * Isso foi medido, nao presumido (D-16): o salto e de 14x — 0,015 ms com 128 trocas contra
 * 0,110 ms com 130 — e mesmo assim o pior caso e 0,15% do intervalo de 80 ms entre renders.
 * O recalculo tambem NAO reenvia nada pela ponte IPC, porque `markdown` e string e o React
 * compara props por valor. Por isso o numero segue 128: mexer nele seria mudanca sem ganho.
 * Reproduzir com `node tests/bench-conversa.mts`.
 */
export function createTurnDerivationCache(maxEntries = 128): TurnDerivationCache {
  const limit = Number.isFinite(maxEntries) ? Math.max(1, Math.floor(maxEntries)) : 128;
  const entries = new Map<string, DerivationEntry>();
  return {
    get(turn, mode, thinking) {
      const previous = entries.get(turn.id);
      if (
        previous !== undefined &&
        previous.turn === turn &&
        previous.revision === turn.revision &&
        previous.mode === mode &&
        previous.thinking === thinking
      ) {
        entries.delete(turn.id);
        entries.set(turn.id, previous);
        return previous.value;
      }
      const value: DerivedTurn = {
        markdown: turnMarkdown(turn, mode, { thinking }),
        title: turnTitle(turn),
        appearance: turnAppearance(turn),
        usedTools: [
          ...new Set(
            turn.steps
              .map((step) => /^🔧 Usando ([^—]+)/u.exec(step)?.[1]?.trim())
              .filter((tool): tool is string => tool !== undefined && tool !== ""),
          ),
        ],
      };
      entries.delete(turn.id);
      entries.set(turn.id, { turn, revision: turn.revision, mode, thinking, value });
      while (entries.size > limit) entries.delete(entries.keys().next().value as string);
      return value;
    },
    clear() {
      entries.clear();
    },
  };
}
