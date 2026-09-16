/**
 * `Perguntar ao Hermes` — a casca do comando principal.
 *
 * Depois do desenho da conversa contínua, esta tela não desenha nada: ela decide QUAL
 * conversa abrir e entrega o resto para `ConversationView`. As três decisões que sobram
 * aqui, nesta ordem:
 *
 * 1. **Guarda de configuração** (§2, convenções): antes de qualquer requisição, resolve a
 *    chave. Sem chave ⇒ tela de primeiro uso, nunca um erro de rede.
 * 2. **De onde vem a conversa** (§8 do desenho): o `launchContext` de quem chamou vence;
 *    sem ele, `ConversationView` cai na última conversa usada. Sem contexto: sem ler o
 *    `sessionId`, a continuação viraria silenciosamente uma conversa nova e o histórico do
 *    Hermes Desktop se partiria em dois.
 * 3. **O argumento `pergunta`**, quando vem preenchido, é enviado como primeiro turno sem
 *    passar por tela nenhuma — o comportamento que o comando já tinha.
 *
 * O que saiu daqui: o `AskForm` (virou o desvio `Escrever mensagem longa`, dentro da
 * conversa) e a `AnswerView` (deixou de existir: cada turno é um item da lista).
 */

import { Action, ActionPanel, Detail, Form, Icon, openExtensionPreferences, type LaunchProps } from "@raycast/api";
import { usePromise } from "@raycast/utils";

import { ConversationView } from "./components/conversation-view";
import { NotConfigured } from "./components/first-run";
import { SHORTCUTS } from "./components/shortcuts";
import { isConfigured } from "./lib/preferences";

const COMMAND_TITLE = "Ask Hermes";

type AskArguments = {
  /** `required: false` no manifest: vazio nunca é erro, abre a conversa em branco. */
  pergunta?: string;
};

/**
 * O que `Continuar esta conversa` entrega quando lança este comando de outra tela
 * (`sessions.tsx`, `session-detail.tsx`, `run-progress.tsx`). É um `type`, e não uma
 * `interface`, porque só um alias de objeto é atribuível ao índice de `LaunchContext`.
 */
type AskLaunchContext = {
  sessionId?: string;
  sessionTitle?: string;
  /** §8.6: a conversa foi mexida no Hermes Desktop há menos de 30 s. */
  avisoUsoRecente?: boolean;
};

export default function Command(
  props: LaunchProps<{ arguments: AskArguments; draftValues: Form.Values; launchContext: AskLaunchContext }>,
) {
  const question = (props.arguments?.pergunta ?? "").trim();
  const context = props.launchContext;

  const { data: configured, isLoading, revalidate } = usePromise(isConfigured);

  if (isLoading) {
    return (
      <Detail
        isLoading
        navigationTitle={COMMAND_TITLE}
        markdown="_Preparando…_"
        actions={
          <ActionPanel>
            <Action
              title="Open Settings"
              icon={Icon.Gear}
              shortcut={SHORTCUTS.preferences}
              onAction={openExtensionPreferences}
            />
          </ActionPanel>
        }
      />
    );
  }

  if (configured !== true) return <NotConfigured commandTitle={COMMAND_TITLE} onRetry={revalidate} />;

  return (
    <ConversationView
      initialSessionId={context?.sessionId}
      initialSessionTitle={context?.sessionTitle}
      initialMessage={question === "" ? undefined : question}
      warnConcurrent={context?.avisoUsoRecente === true}
    />
  );
}
