/**
 * Tela de aprovação (UX-SPEC §7) — a superfície de segurança da extensão.
 *
 * Quatro invariantes, nesta ordem de importância:
 *
 * 1. **Nunca aprovar automaticamente.** Não existe preferência, "lembrar minha escolha" nem
 *    aprovação em lote. `rememberUserChoice` é sempre `false`.
 * 2. **Nunca inventar informação.** O evento `approval.request` traz `command`, `description`,
 *    `pattern_key(s)`, `request_id` e `choices` — e **não** traz `tool_name` nem `args`
 *    (desvio D5). Rotular a ação com um nome de ferramenta deduzido é proibido.
 * 3. **As opções vêm do servidor.** Renderizamos exatamente o array `choices` recebido, na
 *    ordem em que veio (armadilha 25). Nada de lista fixa.
 * 4. **A fila é FIFO e não endereçável** (armadilha 23): o `request_id` só correlaciona; o
 *    POST resolve o pedido mais antigo. Por isso o aviso da §7.5 quando há mais de um.
 *
 * Fica em `components/` porque `Execuções do Hermes` responde aprovações pela mesma tela.
 */

import {
  Action,
  ActionPanel,
  Alert,
  confirmAlert,
  Detail,
  Icon,
  openExtensionPreferences,
  showToast,
  Toast,
  useNavigation,
  type Keyboard,
} from "@raycast/api";
import { useRef, useState } from "react";
import { hermesDesktopSessionUrl } from "../lib/discovery";
import { toHermesError } from "../lib/errors";
import { respondToApproval, stopRun } from "../lib/hermes-api";
import { RUN_STATUS_APPEARANCE, runStatusLabel } from "../lib/status";
import { tagTone } from "./run-progress";
import type { ApprovalChoice, ApprovalRequestFields } from "../lib/types";
import { approvalActionHint, approvalDetailsLostHint } from "../lib/approval-copy";
import { SHORTCUTS } from "./shortcuts";

/**
 * §7.3 — padrões conhecidamente destrutivos. A lista literal vem da UX-SPEC; as quatro
 * palavras soltas cobrem chaves novas que o servidor venha a emitir.
 */
const DESTRUCTIVE_PATTERN_KEYS: ReadonlySet<string> = new Set([
  "rm-rf",
  "del",
  "format",
  "drop",
  "truncate",
  "shutdown",
  "reg-delete",
  "git-push-force",
]);
const DESTRUCTIVE_HINTS = ["delete", "remove", "destroy", "force"];

export function isDestructive(patternKeys: readonly string[]): boolean {
  return patternKeys.some((key) => {
    const value = key.toLowerCase();
    return DESTRUCTIVE_PATTERN_KEYS.has(value) || DESTRUCTIVE_HINTS.some((hint) => value.includes(hint));
  });
}

const RISK_DESTRUCTIVE =
  "> ⛔ **Destructive action.** This command can delete or overwrite files for good. Only approve it if you understand exactly what it does.";
const RISK_SENSITIVE = "> ⚠️ **Sensitive action.** This command can change files or run programs on your computer.";
const RISK_SMART_DENIED =
  "> 🛑 **Hermes recommended denying this action.** Approving it counts for this one time only.";

/**
 * Cerca de código maior que a maior sequência de crases do conteúdo.
 *
 * `command` é texto escolhido pelo modelo e influenciável por injeção no material que o
 * agente leu. Com uma cerca fixa de três crases, um comando contendo ``` fecha o bloco e o
 * resto vira Markdown vivo — na ÚNICA tela cuja função é o usuário julgar o que autoriza.
 * Daria para empurrar o bloco de risco real para fora da dobra, forjar um `> ✅` no mesmo
 * estilo e inserir um link clicável dentro do diálogo de permissão.
 */
function codeFence(content: string): string {
  let longest = 0;
  for (const run of content.match(/`+/g) ?? []) longest = Math.max(longest, run.length);
  return "`".repeat(Math.max(3, longest + 1));
}

/**
 * `description` vai em PROSA, então não há cerca protegendo-a: uma quebra de linha sai do
 * parágrafo e `#`, `>` ou `[texto](url)` viram estrutura. Colapsamos para uma linha e
 * escapamos os marcadores de início de linha; o texto continua legível e literal.
 */
function inlineText(value: string): string {
  return value.replace(/\s*[\r\n]+\s*/g, " ").replace(/^([#>\-*+])/, "\\$1");
}

const TIMEOUT_NOTE =
  "Hermes is stopped, waiting for your answer. If nobody answers, it gives up on its own after a few minutes.";

const DETAILS_LOST = `# Approval pending

Hermes is waiting for an answer from you before it carries on.

${approvalDetailsLostHint()}

${approvalActionHint()} You can ask for the task again and leave Raycast open to see the full request.
`;

export interface ApprovalViewProps {
  runId: string;
  fields: ApprovalRequestFields;
  /** Quantos pedidos estão na fila desta tarefa (§7.5). */
  pendingCount: number;
  /** `true` quando o payload se perdeu com a janela fechada (§7.6). */
  detailsLost: boolean;
  /** Primeiros 60 caracteres do pedido do usuário — metadata "Tarefa". */
  taskPreview: string;
  conversationTitle: string;
  sessionId?: string;
  /** Chamado depois do POST, com quantos pedidos o servidor resolveu de uma vez. */
  onResolved: (choice: ApprovalChoice, resolved: number) => void;
  /**
   * `See the Task Steps` (`Ctrl+T`, §7.4). Quem chama decide o que "ver as etapas"
   * significa na sua pilha de navegação: voltar para a tela da execução em modo Etapas
   * (`ask`, `run-progress`) ou abri-la por cima (`Execuções do Hermes`).
   */
  onShowSteps?: () => void;
}

interface ChoiceSpec {
  title: string;
  icon: Icon;
  shortcut?: Keyboard.Shortcut;
  style?: Action.Style;
  confirm?: Alert.Options;
}

/** §7.4 — título, atalho, estilo e confirmação de cada `choice` que o servidor pode mandar. */
const CHOICE_SPECS: Record<ApprovalChoice, ChoiceSpec> = {
  once: {
    title: "Approve Just This Once",
    icon: Icon.Check,
    // Sem atalho: é a ação primária (Enter) quando o servidor a oferece primeiro.
  },
  session: {
    title: "Approve for This Task",
    icon: Icon.Clock,
    shortcut: SHORTCUTS.approveSession,
    confirm: {
      title: "Approve for This Whole Task?",
      message: "Hermes will be able to repeat similar commands until this task ends, without asking again.",
      primaryAction: { title: "Approve for This Task", style: Alert.ActionStyle.Default },
      dismissAction: { title: "Cancel", style: Alert.ActionStyle.Cancel },
    },
  },
  always: {
    title: "Always Approve This Kind of Command",
    icon: Icon.ExclamationMark,
    shortcut: SHORTCUTS.approveAlways,
    style: Action.Style.Destructive,
    confirm: {
      title: "Always Approve This Kind of Command?",
      message:
        "Commands similar to this one will run without asking your permission, now and in the future, in any conversation. The rule applies to the command pattern, not only to this exact text. You can undo this in Hermes Desktop.",
      primaryAction: { title: "Always Approve", style: Alert.ActionStyle.Destructive },
      dismissAction: { title: "Cancel", style: Alert.ActionStyle.Cancel },
      // Uma confirmação lembrada anularia a própria confirmação (§7.4).
      rememberUserChoice: false,
    },
  },
  deny: {
    title: "Deny",
    icon: Icon.XMarkCircle,
    shortcut: SHORTCUTS.deny,
  },
};

function buildMarkdown(props: ApprovalViewProps): string {
  const { fields, pendingCount, detailsLost } = props;
  const patternKeys = [...(fields.pattern_keys ?? []), ...(fields.pattern_key ? [fields.pattern_key] : [])];

  const queueWarning =
    pendingCount > 1
      ? `\n> There are ${pendingCount} approval requests in this task. Your answer applies to the oldest of them.\n`
      : "";

  if (detailsLost) return `${DETAILS_LOST}${queueWarning}\n${TIMEOUT_NOTE}\n`;

  const risk =
    fields.smart_denied === true ? RISK_SMART_DENIED : isDestructive(patternKeys) ? RISK_DESTRUCTIVE : RISK_SENSITIVE;

  const command = fields.command ?? "(Hermes did not say what the command is)";
  const fence = codeFence(command);
  const description = fields.description === undefined ? "Hermes did not explain why." : inlineText(fields.description);

  return `# Hermes needs your permission

It wants to run this command on your computer:

${fence}
${command}
${fence}

**Why we are asking:** ${description}

${risk}

${approvalActionHint()}

If you do not recognize this command, or did not ask for anything like it, choose **Deny**.
${queueWarning}
${TIMEOUT_NOTE}
`;
}

export function ApprovalView(props: ApprovalViewProps) {
  const { runId, fields, detailsLost, taskPreview, conversationTitle, sessionId, onResolved, onShowSteps } = props;
  const { pop } = useNavigation();
  /**
   * Trava SÍNCRONA. `useState` só valeria no render seguinte, e a fila de aprovações é
   * FIFO e não endereçável (armadilha 23): dois Enter rápidos mandariam dois POST e o
   * segundo resolveria o PRÓXIMO pedido, que o usuário nunca viu.
   */
  const responding = useRef(false);
  const [isResponding, setIsResponding] = useState(false);

  const desktopUrl = hermesDesktopSessionUrl(sessionId);
  const patternKey = fields.pattern_key ?? fields.pattern_keys?.[0];

  async function respond(choice: ApprovalChoice, confirmation?: Alert.Options): Promise<void> {
    if (responding.current) return;
    if (confirmation && !(await confirmAlert(confirmation))) return;

    responding.current = true;
    setIsResponding(true);
    try {
      const response = await respondToApproval(runId, choice);
      onResolved(choice, response.resolved);
      await showToast({
        style: Toast.Style.Success,
        title:
          choice === "deny" ? "Denied. Hermes will carry on without that action." : "Approved. Hermes will continue.",
        // A API resolve a fila inteira quando os pedidos são equivalentes (§7.5).
        message: response.resolved > 1 ? `${response.resolved} requests were answered at once.` : undefined,
      });
      pop();
    } catch (err) {
      const hermes = toHermesError(err, `POST /v1/runs/${runId}/approval`);
      // E12: já respondido em outro aplicativo — a tela volta, não insiste.
      await showToast({ style: Toast.Style.Failure, title: hermes.userMessage });
      responding.current = false;
      setIsResponding(false);
    }
  }

  /** §6.6 item 6: `Parar` não tem `confirmAlert` — é a saída de emergência. */
  async function stop(): Promise<void> {
    const toast = await showToast({ style: Toast.Style.Animated, title: "Stopping the task…" });
    try {
      await stopRun(runId);
      toast.style = Toast.Style.Success;
      toast.title = "Task stopped";
      pop();
    } catch (err) {
      const hermes = toHermesError(err, `POST /v1/runs/${runId}/stop`);
      // Armadilha 21: 404 aqui significa "a tarefa já tinha terminado", nunca erro.
      if (hermes.httpStatus === 404) {
        toast.style = Toast.Style.Success;
        toast.title = "Task stopped";
        pop();
        return;
      }
      toast.style = Toast.Style.Failure;
      toast.title = hermes.userMessage;
    }
  }

  // Exatamente o array do servidor, na ordem recebida (armadilha 25). Um `choice` que não
  // conhecemos é ignorado: sem rótulo confiável, botão nenhum. O `?? []` é defesa contra o
  // fio: `choices` chega de um cast do frame do stream, sem validação de forma, e um
  // `undefined` aqui derrubaria a tela — deixando o usuário sem conseguir nem negar.
  const known = (fields.choices ?? []).filter((c) => Object.hasOwn(CHOICE_SPECS, c));
  // Se sobrar zero opção conhecida — `choices` veio vazio, ou só com rótulos que não
  // reconhecemos — a tela ficaria SEM nenhuma saída: nem aprovar, nem negar, nem parar,
  // com a tarefa travada esperando resposta. `deny` é o mesmo default que
  // `run-progress.tsx` e `use-run-stream.ts` já usam ao reidratar um pedido perdido, e é
  // o único seguro: nunca inventar uma aprovação que o usuário não deu.
  const offered = detailsLost || known.length === 0 ? (["deny"] as ApprovalChoice[]) : known;
  /** Sem opção vinda do servidor, `Parar tarefa` também precisa existir (§7.6). */
  const showStop = detailsLost || known.length === 0;

  return (
    <Detail
      navigationTitle="Approval Needed"
      isLoading={isResponding}
      markdown={buildMarkdown(props)}
      metadata={
        <Detail.Metadata>
          {/* Esta é a tela mais crítica da extensão — a única em que o usuário autoriza o
              Hermes a mexer na máquina — e era a única sem nenhum ícone ou cor. O estado
              vem do mesmo par ícone+cor de `status.ts`, no âmbar que o Hermes reserva ao
              "aja agora"; `Label` só aceita cor do enum, então o estado vira `TagList`. */}
          <Detail.Metadata.TagList title="State">
            <Detail.Metadata.TagList.Item
              text={runStatusLabel("waiting_for_approval")}
              {...tagTone(RUN_STATUS_APPEARANCE.waiting_for_approval)}
            />
          </Detail.Metadata.TagList>
          <Detail.Metadata.Label title="Task" text={taskPreview} icon={Icon.Hourglass} />
          <Detail.Metadata.Label title="Conversation" text={conversationTitle} icon={Icon.SpeechBubble} />
          {/* `pattern_key` cru de propósito: é o identificador confiável do tipo de bloqueio. */}
          {patternKey ? <Detail.Metadata.Label title="Block Type" text={patternKey} icon={Icon.Lock} /> : null}
          {fields.request_id ? <Detail.Metadata.Label title="Identifier" text={fields.request_id.slice(0, 8)} /> : null}
        </Detail.Metadata>
      }
      actions={
        <ActionPanel>
          <ActionPanel.Section>
            {offered.map((choice) => {
              const spec = CHOICE_SPECS[choice];
              return (
                <Action
                  key={choice}
                  title={spec.title}
                  icon={spec.icon}
                  style={spec.style}
                  shortcut={spec.shortcut}
                  onAction={() => void respond(choice, spec.confirm)}
                />
              );
            })}
          </ActionPanel.Section>
          <ActionPanel.Section>
            {fields.command ? (
              <Action.CopyToClipboard title="Copy Command" content={fields.command} shortcut={SHORTCUTS.copy} />
            ) : null}
            {/* §7.4: `See the Task Steps` faz parte da tabela de ações desta tela. */}
            {onShowSteps !== undefined ? (
              <Action
                title="See the Task Steps"
                icon={Icon.List}
                shortcut={SHORTCUTS.toggleSteps}
                onAction={onShowSteps}
              />
            ) : null}
            {/* §7.6: sem detalhes, ou sem opção utilizável do servidor, parar a tarefa é
                uma das saídas oferecidas — senão a tela vira um beco sem saída. */}
            {showStop ? (
              <Action
                title="Stop the Task"
                icon={Icon.Stop}
                style={Action.Style.Destructive}
                shortcut={SHORTCUTS.stop}
                onAction={() => void stop()}
              />
            ) : null}
            {desktopUrl ? (
              <Action.Open
                title="Open in Hermes Desktop"
                icon={Icon.Desktop}
                target={desktopUrl}
                shortcut={SHORTCUTS.openInDesktop}
              />
            ) : null}
            {/* §5.1 regra 3 / §9.2: `Open Settings` existe em TODA tela. */}
            <Action
              title="Open Settings"
              icon={Icon.Gear}
              shortcut={SHORTCUTS.preferences}
              onAction={openExtensionPreferences}
            />
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
}
