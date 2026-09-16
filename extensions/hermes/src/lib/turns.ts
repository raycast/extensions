/**
 * `turns.ts` — a lógica pura da conversa contínua (desenho §9.3).
 *
 * Puro de propósito: nada de React, nada de rede, nada de `@raycast/api`. É o que permite
 * testar com `node --test` (D-07) a parte que erra em silêncio — o pareamento de mensagens
 * e a trava da fila — sem subir uma tela.
 *
 * O que este módulo sabe e as outras camadas não precisam saber:
 *
 * 1. **Uma troca não é um par de mensagens.** O Hermes grava uma pergunta e a resposta com
 *    muitas mensagens no meio: `assistant` de conteúdo vazio carregando só `tool_calls`, e
 *    uma `tool` por chamada (conferido ao vivo em `20260819_153125_397cfb`, 87 mensagens
 *    para 4 perguntas). Renderizar mensagem a mensagem é exatamente a tela que o usuário
 *    reclamou; aqui elas voltam a ser TROCAS.
 * 2. **A fila é a única trava de R9.** Medido ao vivo em 2026-08-19: duas execuções na
 *    mesma conversa são aceitas com 202, rodam ao mesmo tempo, e as mensagens são gravadas
 *    na ordem em que TERMINAM — a segunda pergunta apareceu depois da primeira resposta
 *    porque terminou depois, e uma resposta de uma palavra levou 79 s por disputar a
 *    conversa. O servidor não recusa; quem recusa é `nextQueued`.
 * 3. **Texto recebido nunca é apagado** (UX-SPEC §5.3): o erro do turno entra ABAIXO do que
 *    já chegou, separado por `---`.
 */

import {
  isTerminalRunStatus,
  RUN_EXPIRED,
  RUN_EXPIRED_DETAIL,
  RUN_STATUS_APPEARANCE,
  RUN_STATUS_LABEL,
  type LabeledAppearance,
} from "./status";
import type { HermesError } from "./errors";
import type { RunDiagnostic, TransportPhase } from "./types";
import type { RunStatus, SessionMessage } from "./types";

/* ────────────────────────────── O turno ────────────────────────────── */

/**
 * - `queued`: escrito pelo usuário, ainda não enviado (a fila da §7).
 * - `live`: turno DESTA sessão do Raycast, com estado de execução — inclusive depois de
 *   terminar, porque é o `status` que dá o rótulo dos 7 (`Done`, `Failed`…).
 * - `past`: veio do servidor; nunca teve stream e não tem estado de execução.
 */
export type TurnState = { kind: "queued" } | { kind: "live"; runId?: string; status: RunStatus } | { kind: "past" };

export interface Turn {
  /** Identidade estável do item da lista. Nunca reutilizada. */
  id: string;
  /** Revisão monotônica para invalidar derivações após uma atualização imutável. */
  revision?: number;
  /** O que o usuário escreveu. Vazio na troca que abre uma conversa sem pergunta. */
  message: string;
  /** O que o Hermes respondeu — acumulado enquanto escreve. */
  answer: string;
  steps: string[];
  state: TurnState;
  transportPhase?: TransportPhase;
  diagnostic?: RunDiagnostic;
  startedAt?: number;
  finishedAt?: number;
  /** Instante em que entrou na fila; usado para não cancelar mensagens novas após stop/falha. */
  queuedAt?: number;
  /** Erro DESTE turno. A conversa continua na tela e a próxima mensagem pode ser enviada. */
  error?: HermesError;
  /**
   * `GET /v1/runs/{id}` devolveu 404: o gateway reiniciou ou passou o TTL de 1 hora.
   * É CONDIÇÃO, não estado (UX-SPEC §4.3) — por isso mora aqui e não em `state.status`:
   * mapeá-la para `failed` seria mentir sobre uma tarefa que pode ter terminado bem.
   */
  expired?: boolean;
}

export type TurnMode = "resposta" | "etapas";

/** Título do item da lista: a pergunta encurtada (desenho §4.2). */
export const TURN_TITLE_CHARS = 60;

/**
 * Teto do texto renderizado por turno. O mesmo de `session-detail.tsx`: cada `setState`
 * atravessa a ponte IPC até o host WPF, e uma mensagem de ferramenta bruta tem dezenas de
 * milhares de caracteres.
 */
export const MAX_TURN_CHARS = 6_000;

/* ─────────────────────────── Textos literais ─────────────────────────── */

const YOU = "**You**";
const SEPARATOR = "---";
/** Literal de `session-detail.tsx`, para o corte ser o mesmo nas duas telas. */
const LONG_MESSAGE_NOTE = "_Long message: showing only the beginning._";
/** UX-SPEC §2.1.4. */
const EMPTY_ANSWER = "Hermes finished without writing an answer.";
/** UX-SPEC §6.1 — os dois únicos textos automáticos, agora por turno. */
const PREPARING = "_Preparing…_";
const THINKING = "_Hermes is thinking…_";
const NO_STEPS = "_No steps yet._";
/** §7 do desenho: a fila não dispara em cima de um erro, e o turno diz por quê. */
const NEVER_SENT = "> This message was never sent, because the previous answer had not finished.";
/**
 * Título da troca cujo começo ficou fora da página carregada — acontece sempre que uma
 * conversa longa é aberta pelas 120 mensagens mais novas e a página cai no meio de uma
 * troca. Deriva do literal já existente `Carregar parte anterior da conversa` (§4.6).
 */
const OLDER_PART_TITLE = "Earlier part of this conversation";

/* ──────────────────────────── Pareamento ──────────────────────────── */

function clamp(text: string): string {
  return text.length <= MAX_TURN_CHARS ? text : `${text.slice(0, MAX_TURN_CHARS)}\n\n${LONG_MESSAGE_NOTE}`;
}

/**
 * Pareia `GET /api/sessions/{id}/messages` em trocas.
 *
 * Regra: cada mensagem `user` abre uma troca; tudo que vier depois (assistant, tool,
 * system) pertence a ela até a próxima `user`. Mensagens antes da primeira `user` viram
 * uma troca sem pergunta — é o que acontece numa conversa que começa por `system`.
 *
 * A ordenação real é por `id` (autoincrement), nunca por `timestamp`: a mesma regra que
 * `session-detail.tsx` já usa para juntar páginas.
 */
export function pairMessagesIntoTurns(messages: readonly SessionMessage[]): Turn[] {
  const ordered = [...messages].sort((a, b) => a.id - b.id);
  const turns: Turn[] = [];
  /** As respostas de cada troca, ainda soltas: várias `assistant` podem trazer prosa. */
  const answers: string[][] = [];

  for (const message of ordered) {
    if (message.role === "user" || turns.length === 0) {
      turns.push({
        id: String(message.id),
        message: message.role === "user" ? (message.content ?? "").trim() : "",
        answer: "",
        steps: [],
        state: { kind: "past" },
      });
      answers.push([]);
      if (message.role === "user") continue;
    }

    const index = turns.length - 1;
    if (message.role === "assistant") {
      // A maioria das `assistant` de uma troca vem com conteúdo vazio, carregando só
      // `tool_calls`. Só a prosa entra na resposta.
      const content = (message.content ?? "").trim();
      if (content !== "") answers[index].push(content);
    } else if (message.role === "tool") {
      // Etapa reconstruída da única evidência que sobra no banco: a ferramenta rodou.
      // Duração e sucesso não são recuperáveis daqui — não invente (UX-SPEC §6.3).
      // O prefixo `🔧 Usando ` é contrato: é por ele que a metadata extrai o nome.
      const tool = (message.tool_name ?? "").trim();
      if (tool !== "") turns[index].steps.push(`🔧 Using ${tool}`);
    }
  }

  for (const [index, turn] of turns.entries()) turn.answer = answers[index].join("\n\n");
  return turns;
}

/* ──────────────────────── O corpo do painel ──────────────────────── */

export interface TurnMarkdownOptions {
  /** UX-SPEC §6.1: passaram 3 s sem nada chegar NESTE turno. */
  thinking?: boolean;
}

/**
 * Terminal = o servidor não mexe mais neste turno. `past` também é: já é passado.
 *
 * **Expirado conta como terminado**, embora o `status` congelado possa ser `running`: o
 * Hermes esqueceu a execução (404), então nada mais vai acontecer com ela. Sem esta linha o
 * turno expirado ficava sem `Tentar novamente` e — pior — segurava a fila para sempre.
 */
export function isTurnFinished(turn: Turn): boolean {
  if (turn.state.kind === "past" || turn.expired === true) return true;
  return turn.state.kind === "live" && isTerminalRunStatus(turn.state.status);
}

/** Enfileirado e cancelado sem nunca ter saído daqui: a fila parou por causa de um erro. */
function wasNeverSent(turn: Turn): boolean {
  return (
    (turn.transportPhase ?? "not_sent") === "not_sent" &&
    turn.state.kind === "live" &&
    turn.state.status === "cancelled" &&
    turn.startedAt === undefined
  );
}

function placeholder(turn: Turn, options: TurnMarkdownOptions): string | undefined {
  if (wasNeverSent(turn)) return NEVER_SENT;
  // Expirado não é "terminou sem escrever": o Hermes esqueceu a tarefa, que pode até ter
  // terminado bem. As duas frases juntas se contradizem sobre a mesma execução, e a
  // explicação da expiração (`RUN_EXPIRED_DETAIL`, abaixo) já diz tudo o que sabemos.
  if (turn.expired === true) return undefined;
  if (isTurnFinished(turn) && turn.state.kind === "live") return EMPTY_ANSWER;
  return options.thinking === true ? THINKING : PREPARING;
}

/**
 * O markdown do painel de um turno, nos dois modos.
 *
 * Os avisos que não pertencem ao turno — parada pedida, aprovação pendente, acompanhamento
 * perdido, detalhes técnicos — são montados por quem chama, ACIMA deste bloco: eles falam
 * da tela naquele instante, não do conteúdo da troca.
 */
export function turnMarkdown(turn: Turn, mode: TurnMode, options: TurnMarkdownOptions = {}): string {
  const blocks: string[] = [];

  // Troca sem pergunta (a que abre uma conversa começada por `system`): sem cabeçalho
  // "Você" nem separador, senão o painel abre com dois títulos e nada entre eles.
  if (turn.message !== "") blocks.push(YOU, clamp(turn.message), SEPARATOR);

  if (mode === "etapas") {
    blocks.push("### Etapas", turn.steps.length > 0 ? turn.steps.join("\n\n") : NO_STEPS);
  } else if (turn.answer !== "") {
    blocks.push(clamp(turn.answer));
  } else if (turn.error === undefined) {
    const aguardando = placeholder(turn, options);
    if (aguardando !== undefined) blocks.push(aguardando);
  }

  // §5.3: o erro vem DEPOIS do texto já recebido, nunca no lugar dele.
  const fecho =
    turn.error !== undefined ? turn.error.userMessage : turn.expired === true ? RUN_EXPIRED_DETAIL : undefined;
  if (fecho !== undefined) {
    // O separador só existe para separar. Sem nada acima dele — turno sem texto nenhum, ou
    // troca sem pergunta — ele viraria uma régua solta, ou duas coladas logo abaixo da que
    // fecha o cabeçalho "Você".
    if (blocks.length > 0 && blocks[blocks.length - 1] !== SEPARATOR) blocks.push(SEPARATOR);
    blocks.push(fecho);
  }

  return blocks.join("\n\n");
}

/* ─────────────────── Como o turno aparece na lista ─────────────────── */

/**
 * O título do item. Uma linha só: o `List.Item` não quebra linha, e um título com `\n`
 * some do meio para trás.
 */
export function turnTitle(turn: Turn): string {
  const clean = turn.message.replace(/\s+/g, " ").trim();
  if (clean === "") return OLDER_PART_TITLE;
  return clean.length > TURN_TITLE_CHARS ? `${clean.slice(0, TURN_TITLE_CHARS).trimEnd()}…` : clean;
}

/**
 * Ícone, cor e rótulo do turno — sempre dos 7 rótulos de `status.ts`, ou da condição
 * `Task expired`, que NÃO é um deles (UX-SPEC §4.3).
 *
 * A troca vinda do servidor não tem estado de execução: ela já aconteceu. Com resposta é
 * `Done`; sem resposta é uma pergunta que ainda está sendo respondida em outro lugar
 * (o Hermes Desktop, tipicamente), e aí o rótulo honesto é `Preparing`.
 */
export function turnAppearance(turn: Turn): LabeledAppearance {
  if (turn.expired === true) return RUN_EXPIRED;

  const status: RunStatus =
    turn.state.kind === "live"
      ? turn.state.status
      : turn.state.kind === "past" && turn.answer !== ""
        ? "completed"
        : "queued";

  return { label: RUN_STATUS_LABEL[status], ...RUN_STATUS_APPEARANCE[status] };
}

/* ───────────────────────────── A fila ───────────────────────────── */

/** Um turno que o servidor ainda pode mexer. R9: no máximo um por conversa. */
export function isTurnLive(turn: Turn): boolean {
  if (turn.expired === true) return false;
  return turn.state.kind === "live" && !isTerminalRunStatus(turn.state.status);
}

function endedBadly(turn: Turn): boolean {
  if (turn.error !== undefined) return true;
  return turn.state.kind === "live" && (turn.state.status === "failed" || turn.state.status === "cancelled");
}

/**
 * O próximo turno a disparar, ou `undefined`.
 *
 * Duas recusas, e as duas são deliberadas:
 * - **há turno vivo** ⇒ nada dispara. É a trava de R9, e o servidor não tem outra.
 * - **o turno anterior terminou mal** ⇒ nada dispara sozinho. Emendar uma pergunta em cima
 *   de um erro repetiria o erro em silêncio; quem decide continuar é o usuário, pelo
 *   `Tentar novamente`.
 */
export function nextQueued(turns: readonly Turn[]): Turn | undefined {
  const index = turns.findIndex((turn) => turn.state.kind === "queued");
  if (index < 0) return undefined;
  if (turns.some(isTurnLive)) return undefined;

  const previous = turns[index - 1];
  if (previous !== undefined && endedBadly(previous)) return undefined;

  return turns[index];
}

/**
 * O que disparar agora, considerando um pedido EXPLÍCITO do usuário (`Tentar novamente`).
 *
 * A diferença para `nextQueued`: um pedido explícito fura a recusa de "não disparar depois
 * de erro", porque quem decidiu continuar foi a pessoa, não a fila. O que ele **não** fura é
 * R9 — nada dispara com um turno vivo na conversa, e não há trava do lado do servidor.
 *
 * Um `forcedId` que já não corresponde a nenhum turno enfileirado é simplesmente ignorado:
 * senão um pedido obsoleto (o turno foi removido da fila, ou a conversa trocou) travaria a
 * fila para sempre.
 */
export function pickTurnToRun(turns: readonly Turn[], forcedId?: string): Turn | undefined {
  if (turns.some(isTurnLive)) return undefined;
  if (forcedId !== undefined) {
    const forced = turns.find((turn) => turn.id === forcedId && turn.state.kind === "queued");
    if (forced !== undefined) return forced;
  }
  return nextQueued(turns);
}

/**
 * §7: se o turno anterior falhou ou foi cancelado, o que ficou na fila NÃO dispara sozinho.
 * Estes turnos passam a `Cancelled` e explicam por que não saíram daqui (`turnMarkdown`).
 *
 * `started` é o conjunto de turnos que já foram disparados alguma vez: sem ele, um turno que
 * o usuário acabou de mandar repetir seria cancelado no mesmo instante em que dispara.
 *
 * Devolve a MESMA lista quando não há nada a cancelar — é o que evita um re-render à toa.
 */
export function cancelBlockedQueue(turns: readonly Turn[], started: ReadonlySet<string>): readonly Turn[] {
  if (turns.some(isTurnLive)) return turns;
  if (nextQueued(turns) !== undefined) return turns;

  const latestTerminal = [...turns]
    .filter((turn) => turn.state.kind === "live" && isTerminalRunStatus(turn.state.status))
    .reduce((latest, turn) => Math.max(latest, turn.finishedAt ?? 0), 0);
  const blocked = turns.filter(
    (turn) =>
      turn.state.kind === "queued" &&
      !started.has(turn.id) &&
      // Mensagens criadas depois do desfecho são novos pedidos explícitos e não podem ser
      // descartadas junto com a fila que já estava bloqueada.
      (turn.queuedAt === undefined || turn.queuedAt <= latestTerminal),
  );
  if (blocked.length === 0) return turns;

  const ids = new Set(blocked.map((turn) => turn.id));
  return turns.map((turn) => (ids.has(turn.id) ? { ...turn, state: { kind: "live", status: "cancelled" } } : turn));
}
