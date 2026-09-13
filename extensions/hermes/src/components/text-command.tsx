/**
 * A casca dos comandos de texto da fase 2 (`ask-selection`, `summarize-clipboard`,
 * `fix-clipboard`, `translate-clipboard`).
 *
 * Os quatro fazem a mesma coisa em três passos — pegar um texto, montar uma pergunta a
 * partir dele, e entregar à `ConversationView` como `initialMessage` — e é por isso que a
 * casca mora aqui: **nenhum deles abre tela nova**. Quem precisa de "prompt pronto →
 * resposta escrevendo" monta a conversa, e não uma superfície paralela que teria de
 * reimplementar fila, aprovação, parada e sincronia.
 *
 * A armadilha que este arquivo existe para não deixar ninguém repetir:
 *
 * - **`getSelectedText()` REJEITA** quando não há seleção (e também quando a janela da
 *   frente não expõe texto ao sistema).
 * - **`Clipboard.readText()` devolve `undefined`** e não rejeita nunca.
 *
 * São dois testes diferentes. Unificá-los num `try/catch` só transforma "não há nada
 * copiado" em "não consegui ler a seleção", que é mentira, e some com a única instrução
 * que resolveria o problema de quem está lendo.
 */

import { Action, ActionPanel, Clipboard, Detail, Icon, Toast, getSelectedText, showToast } from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { useEffect, useState, type ReactElement } from "react";

import { ConversationView } from "./conversation-view";
import { NotConfigured } from "./first-run";
import { OpenPreferencesAction } from "./common";
import { SHORTCUTS } from "./shortcuts";
import { isConfigured } from "../lib/preferences";
import { prepareInput } from "../lib/input-safety";
import { type PlatformCopy, platformCopy } from "../lib/platform";

/**
 * Teto do texto que acompanha a pergunta. Não é economia de tokens: um turno com 200 000
 * caracteres demora minutos, custa caro e quase sempre é engano — o usuário copiou a página
 * inteira sem querer. Cortar e **dizer** que cortou é melhor que uma espera silenciosa.
 */
export { MAX_INPUT_CHARS } from "../lib/input-safety";

const LONG_INPUT_TOAST = "The text is very long: I kept the beginning and the end and removed only the middle.";

/**
 * Estado vazio dos três comandos de área de transferência, em um lugar só. A tecla de
 * copiar é a do sistema (`Ctrl+C` no Windows, `Cmd+C` no macOS).
 */
export function copyFirstHint(copy: PlatformCopy = platformCopy()): string {
  return `Copy the text you want to work on (\`${copy.copyKeys}\`) and run this command again.`;
}

export type TextSource = "selecao" | "area-de-transferencia";

export interface TextCommandProps {
  /** `navigationTitle` enquanto a captura acontece, e nas telas de erro. */
  commandTitle: string;
  source: TextSource;
  /** Monta a pergunta a partir do texto capturado. */
  buildMessage: (text: string) => string;
  /** O que dizer quando não há texto nenhum para trabalhar. */
  emptyTitle: string;
  emptyDescription: string;
  /** Retorna um aviso quando a entrada exige confirmação antes do envio. */
  confirmBeforeSend?: (text: string) => { title: string; description: string } | undefined;
}

/** O que a captura devolve: o texto já no tamanho de envio, ou nada. */
interface Capture {
  text?: string;
  /** Precisou cortar no teto. O aviso é dado uma vez, por efeito, nunca no render. */
  truncated: boolean;
}

/**
 * `ask-selection` tenta a seleção e cai para a área de transferência; os demais vão direto
 * à área de transferência. A queda existe porque muita janela não entrega a seleção ao
 * sistema — é a regra no Windows e acontece também no macOS, em aplicativo que não expõe
 * texto por acessibilidade —, e exigir seleção transformaria o comando num sorteio.
 */
async function capture(source: TextSource): Promise<Capture> {
  let found: string | undefined;

  if (source === "selecao") {
    try {
      const selected = await getSelectedText();
      if (selected.trim() !== "") found = selected;
    } catch {
      // Rejeitou: não havia seleção, ou a janela da frente não expõe texto ao sistema. Não
      // é erro — é o caminho comum nos dois sistemas, e por isso a área de transferência
      // vem logo em seguida, sem passar por tela de erro.
    }
  }

  if (found === undefined) {
    // NUNCA rejeita: devolve `undefined` quando não há nada. Teste diferente, de propósito.
    const clipboard = await Clipboard.readText();
    if (clipboard !== undefined && clipboard.trim() !== "") found = clipboard;
  }

  if (found === undefined) return { truncated: false };

  const clean = found.trim();
  const prepared = prepareInput(clean);
  return { text: prepared.text, truncated: prepared.truncated };
}

export function TextCommand(props: TextCommandProps): ReactElement {
  const { data: configured, isLoading: checking, revalidate } = usePromise(isConfigured);
  // A captura roda junto da guarda de configuração: ela não toca na rede, e encadear as
  // duas faria a tela piscar duas vezes antes de mostrar qualquer coisa.
  const { data: captured, isLoading: capturing, revalidate: recapture } = usePromise(capture, [props.source]);
  const [confirmed, setConfirmed] = useState(false);

  // O aviso do corte é efeito, nunca render: a conversa re-renderiza a cada 80 ms enquanto
  // a resposta chega, e um `showToast` no corpo do componente viraria uma metralhadora.
  useEffect(() => {
    if (captured?.truncated === true) void showToast({ style: Toast.Style.Failure, title: LONG_INPUT_TOAST });
  }, [captured?.truncated]);

  if (checking || capturing) {
    return (
      <Detail
        isLoading
        navigationTitle={props.commandTitle}
        markdown="_Preparando…_"
        actions={
          <ActionPanel>
            <OpenPreferencesAction />
          </ActionPanel>
        }
      />
    );
  }

  if (configured !== true) return <NotConfigured commandTitle={props.commandTitle} onRetry={revalidate} />;

  if (captured?.text === undefined) {
    return (
      <Detail
        navigationTitle={props.commandTitle}
        markdown={`# ${props.emptyTitle}\n\n${props.emptyDescription}`}
        actions={
          <ActionPanel>
            <ActionPanel.Section>
              <Action title="Try Again" icon={Icon.ArrowClockwise} shortcut={SHORTCUTS.refresh} onAction={recapture} />
              <OpenPreferencesAction />
            </ActionPanel.Section>
          </ActionPanel>
        }
      />
    );
  }

  const confirmation = !confirmed ? props.confirmBeforeSend?.(captured.text) : undefined;
  if (confirmation !== undefined) {
    return (
      <Detail
        navigationTitle={props.commandTitle}
        markdown={`# ${confirmation.title}\n\n${confirmation.description}`}
        actions={
          <ActionPanel>
            <Action title="Send in This Direction" icon={Icon.ArrowRight} onAction={() => setConfirmed(true)} />
            <Action
              title="Pick Another Direction"
              icon={Icon.Pencil}
              onAction={() => {
                setConfirmed(false);
                recapture();
              }}
            />
            <OpenPreferencesAction />
          </ActionPanel>
        }
      />
    );
  }

  // `startNewConversation`: um "resuma isto" caindo no meio de uma conversa sobre outro
  // assunto emendaria dois assuntos sem ninguém pedir. Daqui em diante é conversa normal —
  // dá para continuar perguntando, e ela aparece no Hermes Desktop como qualquer outra.
  return <ConversationView initialMessage={props.buildMessage(captured.text)} startNewConversation />;
}
