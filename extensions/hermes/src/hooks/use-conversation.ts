/**
 * `useConversation` — o motor da conversa contínua (desenho §9).
 *
 * Substitui `useRunStream`, que sabia responder UMA pergunta por montagem: a única forma de
 * fazer o turno seguinte era empilhar outra tela, e era isso que tornava "continuar" um
 * trabalho. Aqui a conversa é a unidade: os turnos se acumulam, o motor é reentrante e o
 * histórico do servidor entra na mesma lista.
 *
 * O transporte NÃO muda (D-01, provado contra o Hermes real):
 *
 *   POST /api/sessions {"source":"desktop","title":"<único>"}   ← só na conversa nova
 *   POST /v1/runs      {"input":"…","session_id":"<id>"}        → 202 {run_id}
 *   GET  /v1/runs/{run_id}/events                               → SSE, assinado NA HORA
 *
 * As cinco regras que moldam este arquivo:
 *
 * 1. **Fechar a janela do Raycast não cancela nada** (D-02, princípio 8 do brief). O
 *    `AbortController` da desmontagem aborta SÓ o leitor local; `POST /v1/runs/{id}/stop`
 *    nunca é chamado na limpeza, nem ao trocar de conversa. Por isso a criação da sessão e
 *    da run vai deliberadamente **sem** `AbortSignal`.
 * 2. **Não existe `GET /v1/runs`.** Quem não gravar o `run_id` perde a execução para
 *    sempre: `rememberRun()` acontece antes de qualquer render, e todo `approval.request`
 *    é persistido no instante em que chega.
 * 3. **O stream tem consumidor único e não é retomável.** Ao cair, reconectar dá 404
 *    embora a run siga viva: a recuperação é `GET /v1/runs/{id}` a cada 2 s.
 * 4. **No máximo um turno vivo por conversa (R9), e a trava é `pickTurnToRun`.** Medido ao
 *    vivo em 2026-08-19: o servidor ACEITA duas execuções na mesma conversa com 202, as
 *    duas rodam ao mesmo tempo, as mensagens são gravadas na ordem em que TERMINAM — e uma
 *    resposta de uma palavra levou 79 s por disputar a conversa com a outra. Não há 409,
 *    não há fila do lado de lá; a fila é esta.
 * 5. **A fila de aprovação é por EXECUÇÃO, não por conversa.** Provado na fonte do Hermes:
 *    `approval_session_key = run_id`, com o comentário "resolving an approval for one run
 *    must not unblock another run's dangerous command"
 *    (`gateway/platforms/api_server.py:6762-6774`). Contar aprovações pendentes por run,
 *    como este arquivo faz, continua correto na segunda execução da mesma conversa.
 *
 * Este módulo não renderiza nada: produz estado. Os rótulos saem de `status.ts` e o corpo
 * dos painéis sai de `turns.ts`.
 */

import { showHUD, showToast, Toast } from "@raycast/api";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { resolveBaseUrl } from "../lib/discovery";
import { HermesError, isAbort, toHermesError } from "../lib/errors";
import {
  askInSession,
  getSessionMessages,
  openRunEventStream,
  reconcileRun,
  startConversation,
  steerRun,
  stopRun,
} from "../lib/hermes-api";
import { consumeRunEventStream, createTextBuffer, type RunStreamHandlers } from "../lib/hermes-events";
import { getHermesPreferences } from "../lib/preferences";
import { canLaunchTurn, nextConversationEpoch, type ConversationContext } from "../lib/conversation-lifecycle";
import { APPROVAL_CHOICE_LABEL, isTerminalRunStatus } from "../lib/status";
import {
  clearApprovalRequest,
  loadApprovalRequest,
  readJson,
  rememberRun,
  saveApprovalRequest,
  saveRunResult,
  StorageKeys,
  updateStoredRun,
  writeJson,
  listStoredRuns,
  listQueuedTurns,
  rememberQueuedTurn,
  removeQueuedTurn,
  type StoredRun,
} from "../lib/storage";
import { cancelBlockedQueue, isTurnLive, pairMessagesIntoTurns, pickTurnToRun, type Turn } from "../lib/turns";
import type { ApprovalChoice, ApprovalRequestFields, Run, RunStatus, SessionMessage } from "../lib/types";

/* ────────────────────────────── Constantes ────────────────────────────── */

/** §8.4 do desenho: a mesma página de 120 que `session-detail.tsx` já usa. */
const HISTORY_PAGE_SIZE = 120;
/**
 * §4.6 do desenho: no máximo 40 trocas renderizadas.
 *
 * Se a interface engasgar com um turno escrevendo — o risco aceito da §15 —, é ESTE número
 * que baixa, antes de qualquer outra coisa ser mexida. E baixa por um motivo medido: o
 * JavaScript da extensão custa 0,02% do intervalo de 80 ms entre renders numa conversa de
 * 330 mensagens (D-16), então o que sobra é o host WPF medindo e desenhando os `List.Item`.
 * Cortar este número reduz quantos itens ele recebe, não quanto a extensão calcula.
 */
export const RENDER_TURN_LIMIT = 40;
/** §8.5: 2 s é a cadência de acompanhamento de uma execução sem stream. */
const POLL_INTERVAL_MS = 2_000;
/** §6.2: ~12 re-renders por segundo, no máximo (armadilha 55). */
const RENDER_BUFFER_MS = 80;
/** §6.1: a única troca automática de texto, agora por turno. */
const THINKING_AFTER_MS = 3_000;
/** `StoredRun.promptPreview` é só para identificar o item na lista. */
const PREVIEW_CHARS = 200;

/** Guarda comum para não reidratar uma fila depois que a conversa capturada deixou de ser atual. */
export function canApplyQueuedRestoration(
  cancelled: boolean,
  mounted: boolean,
  currentEpoch: number,
  capturedEpoch: number,
): boolean {
  return !cancelled && mounted && currentEpoch === capturedEpoch;
}

/* ──────────────────────────────── Tipos ──────────────────────────────── */

/** Erro que chegou DEPOIS de já haver texto na tela: some abaixo, nunca apaga (§5.3). */
export interface StreamFailure {
  message: string;
  /** `true` ⇒ dá para reassinar o stream (E23). `false` ⇒ só resta consultar (E9). */
  canReattach: boolean;
  technical: string;
}

export interface PendingApproval {
  /** Exatamente o que o servidor mandou: `command`, `description`, `choices`… (§7.1). */
  fields: ApprovalRequestFields;
  /** Quantos pedidos estão na fila FIFO desta execução (§7.5). */
  pendingCount: number;
  receivedAt: number;
  /** `true` quando o payload se perdeu com a janela fechada (§7.6). */
  detailsLost: boolean;
}

/**
 * O contrato da §9.3 do desenho, mais o que a tela precisa para cumprir as outras seções
 * dele: a aprovação (§6, item 2 do painel), o erro que toma a tela (§10), e os três campos
 * que alimentam a metadata (§4.3) e o bloco de detalhes técnicos (§5.1).
 */
export interface ConversationController {
  /** Já cortados no teto de render; os mais antigos ficam retidos atrás de `hasOlder`. */
  turns: Turn[];
  sessionId?: string;
  sessionTitle?: string;
  isLoadingHistory: boolean;
  hasOlder: boolean;
  historyFailed: boolean;

  /** Turno em execução agora, se houver. É ele que `Parar` e `Orientar` alcançam. */
  liveTurnId?: string;
  /** §6.1: passaram 3 s sem nada chegar no turno vivo. */
  thinking: boolean;
  liveStream: boolean;
  stopRequested: boolean;
  /** Ferramenta em execução agora — a linha discreta do modo Resposta (§6.3). */
  activeTool?: string;
  approval?: PendingApproval;
  streamFailure?: StreamFailure;
  /** Erro que impede a tela inteira: só quando não há conversa nenhuma a preservar (§10). */
  fatalError?: HermesError;
  /** Modelo que o servidor relatou para o turno vivo (metadata `Modelo`). */
  model?: string;
  runId?: string;
  baseUrl?: string;
  /** A conversa nasceu agora, por nossa conta (decide o aviso de sincronia §8.2). */
  newConversation: boolean;
  pendingSteer?: string;

  /** Devolve o id do turno criado — é nele que a seleção estaciona (§4.5). Vazio ⇒ nada. */
  send: (message: string) => string | undefined;
  dequeue: (turnId: string) => void;
  stop: () => Promise<void>;
  steer: (text: string) => Promise<void>;
  reattach: () => void;
  retry: (turnId: string) => void;
  approvalResolved: (resolved: number) => void;
  loadOlder: () => Promise<void>;
  /** `undefined` ⇒ conversa nova (que só nasce no primeiro envio). */
  switchSession: (sessionId: string | undefined, title?: string) => void;
  /** Renomear a conversa reflete na hora, sem recarregar nada. */
  setSessionTitle: (title: string | undefined) => void;
}

export interface UseConversationOptions {
  /** Veio do `launchContext` (`Conversas`, detalhe, progresso) — vence o LocalStorage. */
  initialSessionId?: string;
  initialSessionTitle?: string;
  /** Argumento `pergunta` do comando: vira o primeiro turno, sem passar por tela nenhuma. */
  initialMessage?: string;
  /**
   * Abre em conversa NOVA, ignorando a última usada. É o que os comandos de texto da fase 2
   * precisam: "resuma isto" cair no meio de uma conversa sobre outro assunto seria emendar
   * dois assuntos sem o usuário pedir. A conversa continua nascendo só no primeiro envio.
   */
  startNewConversation?: boolean;
}

interface ConversationState {
  turns: Turn[];
  sessionId?: string;
  sessionTitle?: string;
  isLoadingHistory: boolean;
  serverHasMore: boolean;
  historyFailed: boolean;
  renderCap: number;
  liveTurnId?: string;
  thinking: boolean;
  liveStream: boolean;
  stopRequested: boolean;
  activeTool?: string;
  approval?: PendingApproval;
  streamFailure?: StreamFailure;
  fatalError?: HermesError;
  model?: string;
  runId?: string;
  baseUrl?: string;
  newConversation: boolean;
  pendingSteer?: string;
}

interface StartedRun {
  runId: string;
  sessionId?: string;
  sessionTitle?: string;
  newConversation: boolean;
  baseUrl: string;
}

interface ModelChoice {
  model?: string;
  provider?: string;
}

type FollowMode = "stream" | "poll";
/**
 * O que um ciclo de acompanhamento descobriu: acabou (`terminal`), a tela morreu (`halt`),
 * o stream caiu e resta consultar (`poll`), ou o usuário pediu para reassinar (`reattach`).
 */
type FollowOutcome = "terminal" | "halt" | "poll" | "reattach";

/* ────────────────────────────── Utilidades ────────────────────────────── */

let turnCounter = 0;

/** Identidade do turno local. Nunca reutilizada, nunca colide com o id de uma mensagem. */
function newTurnId(): string {
  turnCounter += 1;
  return `local_${Date.now()}_${turnCounter}`;
}

/** Espera cancelável: `AbortSignal` encurta o sono, nunca o deixa pendurado. */
function sleep(ms: number, signal: AbortSignal): Promise<void> {
  return new Promise((resolve) => {
    const finish = (): void => {
      clearTimeout(timer);
      signal.removeEventListener("abort", finish);
      resolve();
    };
    const timer = setTimeout(finish, ms);
    signal.addEventListener("abort", finish, { once: true });
  });
}

function seconds(value: number): string {
  return value.toFixed(1);
}

/**
 * P3 — precedência do modelo: `nextTurnModel` (consumido e apagado) > `defaultModel` do
 * LocalStorage > preferência da extensão, aplicada dentro de `createRun()`.
 *
 * A tela da conversa não tem seletor de modelo (o desenho tirou o `Form` do caminho); quem
 * escolhe é `Modelos do Hermes`, gravando nestas duas chaves.
 */
async function resolveModelChoice(): Promise<ModelChoice> {
  const nextTurn = await readJson<ModelChoice>(StorageKeys.nextTurnModel);
  if (nextTurn && (nextTurn.model !== undefined || nextTurn.provider !== undefined)) {
    await writeJson(StorageKeys.nextTurnModel, undefined);
    return nextTurn;
  }
  return (await readJson<ModelChoice>(StorageKeys.defaultModel)) ?? {};
}

/**
 * Armadilha 19: `waiting_for_approval` gruda no `GET /v1/runs/{id}` mesmo depois de a
 * aprovação ter sido respondida em outro aplicativo. Quando o último evento já não é o
 * pedido, o que vale é o evento — o run está andando.
 */
function effectiveStatus(run: Run): RunStatus {
  if (run.status === "waiting_for_approval" && run.last_event !== undefined && run.last_event !== "approval.request") {
    return "running";
  }
  return run.status;
}

/** §4.4: eventos do stream vencem qualquer outra fonte. */
function statusFromEvent(previous: RunStatus, eventName: string): RunStatus {
  // `stopping` só sai por um desfecho real (§6.6.3): um delta atrasado não o desfaz.
  if (previous === "stopping" && !eventName.startsWith("run.")) return previous;
  switch (eventName) {
    case "approval.request":
      return "waiting_for_approval";
    case "run.completed":
      return "completed";
    case "run.failed":
      return "failed";
    case "run.cancelled":
      return "cancelled";
    default:
      return "running";
  }
}

/**
 * Um erro que só pode tomar a tela inteira quando não há conversa nenhuma para preservar
 * (§10 do desenho + UX-SPEC §5.3). Com turnos na tela, o mesmo erro vira erro DO TURNO:
 * apagar a conversa para mostrar um aviso seria destruir o que o usuário estava lendo.
 */
const SCREEN_BLOCKING_ERRORS: ReadonlySet<string> = new Set(["E1", "E2", "E3", "E5", "E6"]);

function blocksWholeScreen(error: HermesError, turns: readonly Turn[]): boolean {
  if (error.uxId === undefined || !SCREEN_BLOCKING_ERRORS.has(error.uxId)) return false;
  // "Há conversa" = existe alguma troca com conteúdo. Um turno que acabou de ser
  // enfileirado e falhou na largada não conta: não há nada para preservar.
  return !turns.some((turn) => turn.state.kind === "past" || turn.answer !== "");
}

/** Só as mensagens mais antigas do que tudo o que já temos: `loadOlder` nunca duplica. */
function olderThan(messages: readonly SessionMessage[], floor: number): SessionMessage[] {
  return messages.filter((message) => message.id < floor);
}

/** E22 — a resposta do agente começa com o aviso de provedor não autenticado. */
const PROVIDER_AUTH_PREFIX = "⚠️ Provider authentication failed";

/**
 * Erros que nascem DENTRO do stream e por isso não têm `uxId` (ver `errors.ts`): o
 * catálogo os numera E21 e E22, mas eles não passam pelo mapeador de HTTP.
 */
function streamError(userMessage: string, technical: string): HermesError {
  return new HermesError({ userMessage, technical, recovery: "retry", retryable: true });
}

/* ──────────────────────────────── O hook ──────────────────────────────── */

export function useConversation(options: UseConversationOptions = {}): ConversationController {
  const [state, setState] = useState<ConversationState>({
    turns: [],
    sessionId: options.initialSessionId,
    sessionTitle: options.initialSessionTitle,
    isLoadingHistory: true,
    serverHasMore: false,
    historyFailed: false,
    renderCap: RENDER_TURN_LIMIT,
    thinking: false,
    liveStream: false,
    stopRequested: false,
    newConversation: false,
  });

  const mountedRef = useRef(true);
  /** Aborta SÓ os leitores locais. Trocado a cada troca de conversa. */
  const abortRef = useRef(new AbortController());
  /** Espelho de `state.turns` para o código assíncrono, sincronizado depois do render. */
  const turnsRef = useRef<Turn[]>([]);
  /** Id EFETIVO da conversa: a resposta de `/messages` pode resolver uma compressão. */
  const sessionIdRef = useRef<string | undefined>(options.initialSessionId);
  /** Mensagens cruas já carregadas do servidor, para paginar para trás sem duplicar. */
  const messagesRef = useRef<SessionMessage[]>([]);
  /** Menor `id` já carregado: o piso de `loadOlder`. */
  const oldestMessageIdRef = useRef<number>(Number.MAX_SAFE_INTEGER);
  /** Turnos já disparados alguma vez — a garantia de que nada roda duas vezes. */
  const startedRef = useRef<Set<string>>(new Set());
  /** `Tentar novamente` é intenção explícita: fura a recusa de "não disparar após erro". */
  const forcedRef = useRef<string | undefined>(undefined);
  const liveTurnIdRef = useRef<string | undefined>(undefined);
  const stopRequestedRef = useRef(false);
  const runIdRef = useRef<string | undefined>(undefined);
  /** Promessa ÚNICA de criação do turno vivo: `Parar` logo após enviar precisa dela. */
  const startingRef = useRef<Promise<StartedRun> | undefined>(undefined);
  const approvalsPendingRef = useRef(0);
  /**
   * `run_id` sob o qual a aprovação PENDENTE foi gravada. Não dá para reusar `runIdRef`: ele
   * aponta para a run VIVA, que já mudou quando um turno da fila avançou e vira `undefined`
   * ao trocar de conversa — apagar por ele erra a chave ou não apaga nada.
   */
  const approvalRunIdRef = useRef<string | undefined>(undefined);
  const streamingRef = useRef(false);
  /** `Acompanhar de novo` durante o polling: acorda o ciclo sem esperar os 2 s. */
  const wakeRef = useRef<AbortController | undefined>(undefined);
  const reattachRef = useRef(false);
  /** Conversa alvo desta carga de histórico. `explicit` ⇒ não cair no LocalStorage. */
  const targetRef = useRef<{ sessionId?: string; explicit: boolean }>({
    sessionId: options.initialSessionId,
    // `explicit` com `sessionId: undefined` é justamente "conversa nova": sem ele, a leitura
    // de `lastSessionId` faria a tela cair na última conversa usada.
    explicit: options.initialSessionId !== undefined || options.startNewConversation === true,
  });
  const [epoch, setEpoch] = useState(0);
  const conversationEpochRef = useRef(0);
  const schedulerPendingRef = useRef<string | undefined>(undefined);
  const sentInitialRef = useRef(false);
  const busyLoadingRef = useRef(false);

  const { streamResponses } = getHermesPreferences();

  useEffect(() => {
    mountedRef.current = true;
    // Um controlador NOVO a cada montagem. Sem isto, o duplo-invoke do StrictMode aborta o
    // controlador na limpeza da primeira passada e a segunda nasce com tudo já cancelado —
    // a tela subiria muda, sem stream e sem histórico.
    abortRef.current = new AbortController();
    return () => {
      mountedRef.current = false;
      // ÚNICO cancelamento da desmontagem: os leitores locais. A run continua no Hermes
      // (D-02); `stopRun()` NUNCA é chamado aqui.
      abortRef.current.abort();
    };
  }, []);

  useEffect(() => {
    turnsRef.current = state.turns;
  }, [state.turns]);

  useEffect(() => {
    liveTurnIdRef.current = state.liveTurnId;
  }, [state.liveTurnId]);

  useEffect(() => {
    stopRequestedRef.current = state.stopRequested;
  }, [state.stopRequested]);

  const alive = useCallback((): boolean => mountedRef.current && !abortRef.current.signal.aborted, []);

  const patch = useCallback((fn: (previous: ConversationState) => ConversationState): void => {
    if (mountedRef.current) setState(fn);
  }, []);

  /** Altera UM turno pelo id. Devolver o mesmo objeto quando nada mudou evita re-render. */
  const patchTurn = useCallback(
    (turnId: string, update: (turn: Turn) => Turn): void => {
      patch((previous) => {
        const index = previous.turns.findIndex((turn) => turn.id === turnId);
        if (index < 0) return previous;
        const updated = update(previous.turns[index]);
        if (updated === previous.turns[index]) return previous;
        const turns = [...previous.turns];
        turns[index] = { ...updated, revision: (previous.turns[index].revision ?? 0) + 1 };
        return { ...previous, turns };
      });
    },
    [patch],
  );

  /* ─────────────────────────── Histórico ─────────────────────────── */

  const applyMessages = useCallback(
    (incoming: SessionMessage[], mode: "initial" | "older"): void => {
      const merged = new Map<number, SessionMessage>();
      for (const message of messagesRef.current) merged.set(message.id, message);
      for (const message of incoming) merged.set(message.id, message);
      const ordered = [...merged.values()].sort((a, b) => a.id - b.id);
      messagesRef.current = ordered;
      if (ordered.length > 0) oldestMessageIdRef.current = ordered[0].id;

      const past = pairMessagesIntoTurns(ordered);
      patch((previous) => ({
        ...previous,
        // Os turnos locais (fila, vivo, já respondidos aqui) ficam SEMPRE depois do
        // passado: eles são as trocas mais novas da conversa por construção.
        turns: [...past, ...previous.turns.filter((turn) => turn.state.kind !== "past")],
        renderCap: mode === "older" ? previous.renderCap + RENDER_TURN_LIMIT : previous.renderCap,
      }));
    },
    [patch],
  );

  /**
   * §8: falha ao carregar o passado NUNCA impede escrever o presente. O aviso aparece e a
   * tela segue utilizável — inclusive numa conversa que existe mas está fora do ar.
   */
  useEffect(() => {
    const controller = abortRef.current;
    let cancelled = false;
    const capturedEpoch = conversationEpochRef.current;

    void (async () => {
      const target = targetRef.current;
      const sessionId = target.explicit
        ? target.sessionId
        : (target.sessionId ?? (await readJson<string>(StorageKeys.lastSessionId)));

      if (!canApplyQueuedRestoration(cancelled, mountedRef.current, conversationEpochRef.current, capturedEpoch))
        return;
      sessionIdRef.current = sessionId;

      if (sessionId === undefined) {
        const queued = await listQueuedTurns(undefined);
        if (!canApplyQueuedRestoration(cancelled, mountedRef.current, conversationEpochRef.current, capturedEpoch))
          return;
        patch((previous) => {
          const existing = new Set(previous.turns.map((turn) => turn.id));
          const restored = queued
            .filter((item) => !existing.has(item.id))
            .map((item) => ({
              id: item.id,
              message: item.message,
              answer: "",
              steps: [],
              queuedAt: item.createdAt,
              transportPhase: "not_sent" as const,
              state: { kind: "queued" as const },
            }));
          return {
            ...previous,
            turns: [...previous.turns, ...restored],
            isLoadingHistory: false,
            sessionId: undefined,
          };
        });
        return;
      }

      patch((previous) => ({ ...previous, sessionId, isLoadingHistory: true, historyFailed: false }));

      try {
        const page = await getSessionMessages(sessionId, {
          limit: HISTORY_PAGE_SIZE,
          offset: 0,
          order: "latest",
          signal: controller.signal,
        });
        if (!canApplyQueuedRestoration(cancelled, mountedRef.current, conversationEpochRef.current, capturedEpoch))
          return;
        // Armadilha 9: o `session_id` da RESPOSTA manda — ele resolve continuações de
        // compressão e pode diferir do pedido.
        if (page.session_id !== "") {
          sessionIdRef.current = page.session_id;
          patch((previous) => ({ ...previous, sessionId: page.session_id }));
        }
        applyMessages(page.data, "initial");
        const queued = await listQueuedTurns(sessionId);
        if (!canApplyQueuedRestoration(cancelled, mountedRef.current, conversationEpochRef.current, capturedEpoch))
          return;
        if (queued.length > 0) {
          patch((previous) => {
            const existing = new Set(previous.turns.map((turn) => turn.id));
            const restored = queued
              .filter((item) => !existing.has(item.id))
              .map((item) => ({
                id: item.id,
                message: item.message,
                answer: "",
                steps: [],
                queuedAt: item.createdAt,
                transportPhase: "not_sent" as const,
                state: { kind: "queued" as const },
              }));
            return restored.length === 0 ? previous : { ...previous, turns: [...previous.turns, ...restored] };
          });
        }
        patch((previous) => ({
          ...previous,
          isLoadingHistory: false,
          serverHasMore: page.pagination.returned >= HISTORY_PAGE_SIZE,
        }));
      } catch (err) {
        if (
          isAbort(err) ||
          !canApplyQueuedRestoration(cancelled, mountedRef.current, conversationEpochRef.current, capturedEpoch)
        )
          return;
        patch((previous) => ({ ...previous, isLoadingHistory: false, historyFailed: true }));
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [epoch, applyMessages, patch]);

  const loadOlder = useCallback(async (): Promise<void> => {
    // §4.6: se já temos trocas retidas além do teto, mostrar mais é de graça — nada de rede.
    if (turnsRef.current.length > state.renderCap) {
      patch((previous) => ({ ...previous, renderCap: previous.renderCap + RENDER_TURN_LIMIT }));
      return;
    }
    if (!state.serverHasMore || sessionIdRef.current === undefined) return;
    if (busyLoadingRef.current) return;
    busyLoadingRef.current = true;

    patch((previous) => ({ ...previous, isLoadingHistory: true }));
    try {
      // `order=latest` conta o offset a partir da mensagem MAIS NOVA (armadilha 11).
      const page = await getSessionMessages(sessionIdRef.current, {
        limit: HISTORY_PAGE_SIZE,
        offset: messagesRef.current.length,
        order: "latest",
        signal: abortRef.current.signal,
      });
      if (!alive()) return;
      // Só o que é mais antigo do que tudo o que já temos. Se mensagens novas entraram no
      // meio-tempo (o Desktop escrevendo na mesma conversa), o offset desliza e a página
      // volta com trocas que já estão na tela — algumas delas as que ESTA tela acabou de
      // criar. O piso por `id` faz a página deslizada ser inofensiva.
      applyMessages(olderThan(page.data, oldestMessageIdRef.current), "older");
      patch((previous) => ({
        ...previous,
        isLoadingHistory: false,
        serverHasMore: page.pagination.returned >= HISTORY_PAGE_SIZE,
      }));
    } catch (err) {
      if (isAbort(err) || !alive()) return;
      patch((previous) => ({ ...previous, isLoadingHistory: false }));
      await showToast({ style: Toast.Style.Failure, title: toHermesError(err, "loadOlder").userMessage });
    } finally {
      busyLoadingRef.current = false;
    }
  }, [alive, applyMessages, patch, state.renderCap, state.serverHasMore]);

  /* ─────────────────────────── O turno vivo ─────────────────────────── */

  const runTurn = useCallback(
    async (turnId: string, message: string, existingRun?: StoredRun): Promise<void> => {
      const controller = abortRef.current;
      const signal = controller.signal;
      const capturedContext: ConversationContext = {
        epoch: conversationEpochRef.current,
        sessionId: sessionIdRef.current,
        turnId,
      };
      const running = (): boolean => mountedRef.current && !signal.aborted;
      const contextIsCurrent = (): boolean =>
        running() &&
        canLaunchTurn(
          {
            epoch: conversationEpochRef.current,
            sessionId: sessionIdRef.current,
            turnId,
            runId: runIdRef.current,
          },
          capturedContext,
        );
      let pushedText = false;

      /**
       * Estado de tela escrito por ESTE turno. Guardado pelo `signal` porque, depois de uma
       * troca de conversa, o acompanhamento antigo ainda pode estar no ar por alguns
       * milissegundos — e um aviso dele pintado na conversa nova seria um erro fantasma.
       * Os `patchTurn` não precisam da guarda: eles procuram o turno pelo id, que já não
       * existe na lista da conversa nova.
       */
      const patchState = (fn: (previous: ConversationState) => ConversationState): void => {
        if (contextIsCurrent()) patch(fn);
      };

      // Cada `setState` atravessa a ponte IPC até o host WPF: agrupa em ~80 ms.
      const buffer = createTextBuffer((text) => {
        if (running()) patchTurn(turnId, (turn) => ({ ...turn, answer: text }));
      }, RENDER_BUFFER_MS);

      let thinkingTimer: ReturnType<typeof setTimeout> | undefined = setTimeout(() => {
        patchState((previous) => (previous.liveTurnId === turnId ? { ...previous, thinking: true } : previous));
      }, THINKING_AFTER_MS);

      const markProgress = (): void => {
        if (thinkingTimer !== undefined) {
          clearTimeout(thinkingTimer);
          thinkingTimer = undefined;
        }
        patchState((previous) => (previous.thinking ? { ...previous, thinking: false } : previous));
      };

      let localRunId: string | undefined;
      const setStatus = (status: RunStatus, extra: Partial<Turn> = {}): void => {
        patchTurn(turnId, (turn) => ({
          ...turn,
          ...extra,
          state: { kind: "live", runId: localRunId, status },
          finishedAt: isTerminalRunStatus(status) ? (turn.finishedAt ?? Date.now()) : turn.finishedAt,
        }));
      };

      async function persistTerminal(runId: string, status: RunStatus, output?: string, error?: string): Promise<void> {
        await updateStoredRun(runId, { lastKnownStatus: status, lastKnownEvent: `run.${status}` });
        await saveRunResult({ runId, status, output, error, savedAt: Date.now() });
      }

      /**
       * Cria (uma única vez) a conversa e a run. Sem `AbortSignal` de propósito: a
       * desmontagem não pode impedir o registro do `run_id`, senão a tarefa nasce órfã e o
       * usuário perde o resultado — não há rota que liste execuções.
       */
      async function createRunOnce(): Promise<StartedRun> {
        if (existingRun !== undefined) {
          return {
            runId: existingRun.runId,
            sessionId: existingRun.sessionId,
            newConversation: false,
            baseUrl: existingRun.baseUrl,
          };
        }
        const choice = await resolveModelChoice();
        // A conversa é a que existia quando este turno nasceu. Se a pessoa trocar de
        // conversa enquanto escolhemos o modelo, a pergunta segue na conversa original —
        // nunca é desviada silenciosamente para a tela que ela abriu depois.
        const existing = capturedContext.sessionId;

        let runId: string;
        let sessionId: string | undefined = existing;
        let sessionTitle: string | undefined;
        let isNew = false;
        // Resolve o destino antes do POST: depois do 202 não pode existir outra espera
        // opcional entre a aceitação da run e o registro mínimo recuperável.
        const { baseUrl } = await resolveBaseUrl();

        if (existing !== undefined) {
          const created = await askInSession(existing, message, { model: choice.model, provider: choice.provider });
          runId = created.run_id;
        } else {
          // D-01: sessão `source:"desktop"` + run amarrada a ela. `startConversation` já
          // desfaz a sessão se a run não for aceita (R4: conversa vazia é lixo invisível).
          const conversation = await startConversation({
            input: message,
            model: choice.model,
            provider: choice.provider,
          });
          runId = conversation.runId;
          sessionId = conversation.sessionId;
          sessionTitle = conversation.title;
          isNew = true;
        }

        // Estes dois refs são de TELA, e a tela pode já ser outra: `createRunOnce` roda sem
        // `AbortSignal` de propósito, então ela sobrevive a uma troca de conversa e resolveria
        // aqui apontando a conversa que o usuário acabou de deixar. Escrever mesmo assim faria
        // a próxima mensagem cair na conversa errada, e `Parar` matar a tarefa errada.
        // `rememberRun`, logo abaixo, continua incondicional: o `run_id` não pode se perder.
        if (contextIsCurrent()) {
          runIdRef.current = runId;
          sessionIdRef.current = sessionId;
        }

        await rememberRun({
          runId,
          turnId,
          sessionId,
          promptPreview: message.slice(0, PREVIEW_CHARS),
          createdAt: Date.now(),
          lastKnownStatus: "queued",
          baseUrl,
        });
        void removeQueuedTurn(turnId).catch(() => undefined);
        // Mesma razão: a última conversa usada é a que está na tela, não a que ficou para trás.
        if (sessionId !== undefined && running()) await writeJson(StorageKeys.lastSessionId, sessionId);

        return { runId, sessionId, sessionTitle, newConversation: isNew, baseUrl };
      }

      function applyApprovalRequest(runId: string, fields: ApprovalRequestFields): void {
        approvalsPendingRef.current += 1;
        approvalRunIdRef.current = runId;
        const receivedAt = Date.now();
        // Persistir NA HORA: não existe rota que devolva um pedido de aprovação perdido.
        // `patternKey`, `patternKeys` e `smartDenied` são obrigatórios: são eles que
        // decidem o bloco de risco da §7.3 e o ícone vermelho de `Execuções do Hermes`.
        void saveApprovalRequest({
          runId,
          command: fields.command,
          description: fields.description,
          choices: fields.choices ?? [],
          requestId: fields.request_id,
          patternKey: fields.pattern_key,
          patternKeys: fields.pattern_keys,
          smartDenied: fields.smart_denied,
          receivedAt,
        }).catch(() => undefined);

        patchTurn(turnId, (turn) => ({ ...turn, steps: [...turn.steps, "🔐 Hermes asked for your approval"] }));
        setStatus("waiting_for_approval");
        patchState((previous) => ({
          ...previous,
          approval: { fields, pendingCount: approvalsPendingRef.current, receivedAt, detailsLost: false },
        }));
      }

      const handlers: RunStreamHandlers = {
        onEvent: (event) => {
          markProgress();
          // Este handler recebe TODO evento, inclusive cada `message.delta`: só mexe no
          // estado quando o status realmente muda, senão o buffer de 80 ms não serve de nada.
          patchTurn(turnId, (turn) => {
            const previous = turn.state.kind === "live" ? turn.state.status : "queued";
            const status = statusFromEvent(previous, event.event);
            if (status === previous) return turn;
            return {
              ...turn,
              state: { kind: "live", runId: runIdRef.current, status },
              finishedAt: isTerminalRunStatus(status) ? (turn.finishedAt ?? Date.now()) : turn.finishedAt,
            };
          });
        },
        // §6.2: com "mostrar enquanto escreve" desligado, nada é pintado até o desfecho.
        onText: streamResponses
          ? (full) => {
              pushedText = true;
              buffer.push(full);
            }
          : undefined,
        onToolStarted: (tool, preview) => {
          patchTurn(turnId, (turn) => ({
            ...turn,
            steps: [...turn.steps, preview ? `🔧 Using ${tool} — ${preview}` : `🔧 Using ${tool}`],
          }));
          patchState((previous) => ({ ...previous, activeTool: tool }));
        },
        onToolCompleted: (tool, duration, failed) => {
          patchTurn(turnId, (turn) => ({
            ...turn,
            steps: [
              ...turn.steps,
              failed
                ? `⚠️ ${tool} failed after ${seconds(duration)} s`
                : `✅ ${tool} finished in ${seconds(duration)} s`,
            ],
          }));
          patchState((previous) => ({ ...previous, activeTool: undefined }));
        },
        onReasoning: (text) => {
          const short = text.length > 100 ? `${text.slice(0, 100)}…` : text;
          patchTurn(turnId, (turn) => ({ ...turn, steps: [...turn.steps, `💭 ${short}`] }));
        },
        onSubagent: (event) => {
          const fields = event as unknown as { goal?: string; summary?: string };
          const line =
            event.event === "subagent.start"
              ? `👥 Helper task started: ${fields.goal ?? "no description"}`
              : `👥 Helper task finished: ${fields.summary ?? "no summary"}`;
          patchTurn(turnId, (turn) => ({ ...turn, steps: [...turn.steps, line] }));
        },
        onApprovalRequest: (fields) => {
          applyApprovalRequest(fields.run_id, fields);
        },
        onApprovalResponded: (choice, resolved) => {
          approvalsPendingRef.current = Math.max(0, approvalsPendingRef.current - Math.max(resolved, 1));
          const stillPending = approvalsPendingRef.current > 0;
          if (!stillPending && approvalRunIdRef.current !== undefined) {
            void clearApprovalRequest(approvalRunIdRef.current).catch(() => undefined);
            approvalRunIdRef.current = undefined;
          }
          patchTurn(turnId, (turn) => ({
            ...turn,
            steps: [...turn.steps, `🔐 Approval answered: ${APPROVAL_CHOICE_LABEL[choice]}`],
          }));
          patchState((previous) => ({
            ...previous,
            approval:
              stillPending && previous.approval
                ? { ...previous.approval, pendingCount: approvalsPendingRef.current }
                : undefined,
          }));
        },
      };

      async function applyRun(run: Run): Promise<void> {
        const status = effectiveStatus(run);
        const terminal = isTerminalRunStatus(status);

        if (status === "waiting_for_approval" && approvalsPendingRef.current === 0) {
          // A janela pode ter sido fechada quando o pedido chegou: procuramos o payload
          // gravado; sem ele, a tela de aprovação entra no modo "detalhes perdidos" (§7.6).
          const stored = await loadApprovalRequest(run.run_id);
          approvalsPendingRef.current = 1;
          approvalRunIdRef.current = run.run_id;
          patchState((previous) => ({
            ...previous,
            approval: {
              fields: {
                command: stored?.command,
                description: stored?.description,
                choices: (stored?.choices ?? ["deny"]) as ApprovalChoice[],
                request_id: stored?.requestId,
                pattern_key: stored?.patternKey,
                pattern_keys: stored?.patternKeys,
                smart_denied: stored?.smartDenied,
              },
              pendingCount: 1,
              receivedAt: stored?.receivedAt ?? Date.now(),
              detailsLost: stored === undefined,
            },
          }));
        }

        patchTurn(turnId, (turn) => ({
          ...turn,
          answer: run.output !== undefined && run.output !== "" ? run.output : turn.answer,
          state: { kind: "live", runId: run.run_id, status },
          transportPhase: terminal ? "reconciling" : turn.transportPhase,
          diagnostic:
            terminal && run.output?.startsWith(PROVIDER_AUTH_PREFIX)
              ? {
                  kind: "provider_authentication",
                  message:
                    "The model you picked is not authenticated in Hermes. Open Hermes Desktop and set up the provider, or pick another model.",
                }
              : turn.diagnostic,
          finishedAt: terminal ? (turn.finishedAt ?? Date.now()) : turn.finishedAt,
        }));
        patchState((previous) => ({
          ...previous,
          model: run.model ?? previous.model,
          pendingSteer: run.pending_steer ?? previous.pendingSteer,
          approval: status === "waiting_for_approval" ? previous.approval : undefined,
        }));

        if (terminal) {
          if (run.output !== undefined) buffer.cancel();
          await persistTerminal(run.run_id, status, run.output, run.error);
        } else {
          await updateStoredRun(run.run_id, {
            lastKnownStatus: status,
            lastKnownEvent: run.last_event,
            expired: false,
          });
        }
      }

      /** Acompanha por SSE. `terminal` (acabou), `poll` (descobrir consultando) ou `halt`. */
      async function followStream(runId: string): Promise<"terminal" | "poll" | "halt"> {
        streamingRef.current = true;
        patchTurn(turnId, (turn) => ({ ...turn, transportPhase: "streaming" }));
        patchState((previous) => ({ ...previous, liveStream: true, streamFailure: undefined }));
        try {
          // Assinar imediatamente: a fila do servidor é destruída após 300 s sem assinante.
          const response = await openRunEventStream(runId, signal);
          const result = await consumeRunEventStream(response, runId, handlers, signal);
          if (pushedText) buffer.flush();
          if (result.aborted || !running()) return "halt";

          if (result.terminalEvent === "run.completed") {
            markProgress();
            // §6.2: o texto final é o `output`; substitui o acúmulo de deltas.
            const output = result.output ?? result.text;
            setStatus("completed", {
              answer: output,
              transportPhase: "reconciling",
              // E22: o agente respondeu, mas a resposta É o aviso de provedor não
              // autenticado. Repetir a pergunta não resolve — trocar de modelo resolve.
              error: undefined,
              diagnostic: output.startsWith(PROVIDER_AUTH_PREFIX)
                ? {
                    kind: "provider_authentication",
                    message:
                      "The model you picked is not authenticated in Hermes. Open Hermes Desktop and set up the provider, or pick another model.",
                  }
                : undefined,
            });
            patchState((previous) => ({ ...previous, pendingSteer: result.pendingSteer, activeTool: undefined }));
            await persistTerminal(runId, "completed", output);
            return "terminal";
          }

          if (result.terminalEvent === "run.failed") {
            markProgress();
            patchTurn(turnId, (turn) => ({
              ...turn,
              state: { kind: "live", runId, status: "failed" },
              finishedAt: turn.finishedAt ?? Date.now(),
              // E21 — o texto do evento já vem redigido pelo servidor.
              error: streamError(
                `Hermes could not finish: ${result.error ?? "no details"}`,
                `run.failed on ${runId}: ${result.error ?? "-"}`,
              ),
              transportPhase: "reconciling",
            }));
            patchState((previous) => ({ ...previous, activeTool: undefined }));
            await persistTerminal(runId, "failed", result.text, result.error);
            return "terminal";
          }

          if (result.terminalEvent === "run.cancelled") {
            markProgress();
            setStatus("cancelled", { transportPhase: "reconciling" });
            patchState((previous) => ({ ...previous, activeTool: undefined }));
            await persistTerminal(runId, "cancelled", result.text);
            return "terminal";
          }

          // `: stream closed` sem desfecho: o servidor sabe o que aconteceu, nós não.
          return "poll";
        } catch (err) {
          if (isAbort(err) || !running()) return "halt";
          const hermes = toHermesError(err, `GET /v1/runs/${runId}/events`);

          if (hermes.uxId === "E9") {
            // 404 ao assinar: o acompanhamento ao vivo se perdeu, a tarefa continua rodando.
            patchState((previous) => ({
              ...previous,
              streamFailure: { message: hermes.userMessage, canReattach: false, technical: hermes.technical },
            }));
            return "poll";
          }

          patchState((previous) => ({
            ...previous,
            // E23 — literal da UX-SPEC §5.2.
            streamFailure: {
              message:
                "The connection to Hermes dropped in the middle of the answer. The task is still going inside Hermes.",
              canReattach: true,
              technical: hermes.technical,
            },
          }));
          // `poll`, não `halt`: qualquer queda do stream cai no acompanhamento por consulta.
          return "poll";
        } finally {
          streamingRef.current = false;
          patchState((previous) => ({ ...previous, liveStream: false }));
        }
      }

      /** Acompanhamento sem stream: consulta a cada 2 s até o estado terminal (§6.5). */
      async function followPolling(runId: string): Promise<"terminal" | "halt" | "reattach"> {
        for (;;) {
          if (!running()) return "halt";
          patchTurn(turnId, (turn) => ({ ...turn, transportPhase: "reconciling" }));
          try {
            const run = await reconcileRun(runId, signal);
            // Um ciclo que deu certo apaga o aviso do ciclo que falhou.
            patchState((previous) =>
              previous.streamFailure === undefined ? previous : { ...previous, streamFailure: undefined },
            );
            if (run === "expired") {
              // 404 = expirada. NUNCA "Failed" (§4.3).
              await updateStoredRun(runId, { expired: true });
              markProgress();
              patchTurn(turnId, (turn) => ({ ...turn, expired: true, finishedAt: turn.finishedAt ?? Date.now() }));
              return "terminal";
            }
            await applyRun(run);
            if (isTerminalRunStatus(effectiveStatus(run))) return "terminal";
          } catch (err) {
            if (isAbort(err) || !running()) return "halt";
            const hermes = toHermesError(err, `GET /v1/runs/${runId}`);
            patchState((previous) => ({
              ...previous,
              streamFailure: { message: hermes.userMessage, canReattach: true, technical: hermes.technical },
            }));
            // Deliberadamente SEM `return`: uma falha de rede passageira não pode encerrar
            // o acompanhamento e deixar a barra girando para sempre.
          }

          const wake = new AbortController();
          wakeRef.current = wake;
          await sleep(POLL_INTERVAL_MS, AbortSignal.any([signal, wake.signal]));
          wakeRef.current = undefined;
          if (reattachRef.current) {
            reattachRef.current = false;
            return "reattach";
          }
        }
      }

      /* — o corpo do turno — */

      stopRequestedRef.current = false;
      patchState((previous) => ({
        ...previous,
        liveTurnId: turnId,
        thinking: false,
        liveStream: false,
        stopRequested: false,
        activeTool: undefined,
        streamFailure: undefined,
        approval: undefined,
        pendingSteer: undefined,
        fatalError: undefined,
        runId: undefined,
      }));
      approvalsPendingRef.current = 0;
      approvalRunIdRef.current = undefined;
      runIdRef.current = undefined;
      reattachRef.current = false;
      patchTurn(turnId, (turn) => ({
        ...turn,
        state: { kind: "live", status: "queued" },
        transportPhase: "starting",
        startedAt: Date.now(),
        finishedAt: undefined,
        error: undefined,
        diagnostic: undefined,
        expired: false,
      }));

      const starting = createRunOnce();
      startingRef.current = starting;
      try {
        const started = await starting;
        if (!running()) return;
        localRunId = started.runId;
        capturedContext.sessionId = started.sessionId;
        capturedContext.runId = started.runId;
        runIdRef.current = started.runId;
        if (started.sessionId !== undefined) sessionIdRef.current = started.sessionId;

        patchState((previous) => ({
          ...previous,
          runId: started.runId,
          sessionId: started.sessionId ?? previous.sessionId,
          sessionTitle: started.sessionTitle ?? previous.sessionTitle,
          newConversation: started.newConversation || previous.newConversation,
          baseUrl: started.baseUrl,
        }));
        // Se Parar foi acionado enquanto a escolha/criação estava suspensa, preserve a
        // transição `stopping`; o retorno do 202 não pode reabrir a execução visualmente.
        setStatus(stopRequestedRef.current ? "stopping" : "queued");
        patchTurn(turnId, (turn) => ({ ...turn, transportPhase: "accepted" }));

        // O ciclo de acompanhamento. Começa sempre pelo stream (mesmo com "mostrar
        // enquanto escreve" desligado: é ele que traz aprovação e etapas na hora); cai para
        // consulta quando o stream morre; e volta ao stream quando o usuário pede
        // `Acompanhar de novo`.
        let mode: FollowMode = "stream";
        for (;;) {
          const outcome: FollowOutcome =
            mode === "stream" ? await followStream(started.runId) : await followPolling(started.runId);
          if (outcome === "terminal" || outcome === "halt") break;
          mode = outcome === "poll" ? "poll" : "stream";
        }
      } catch (err) {
        if (isAbort(err) || !running()) return;
        const hermes = toHermesError(err, "POST /v1/runs");
        markProgress();
        // §10: o erro só toma a tela quando não há conversa nenhuma a preservar.
        if (blocksWholeScreen(hermes, turnsRef.current)) {
          patchState((previous) => ({ ...previous, fatalError: hermes }));
          patchTurn(turnId, (turn) => ({ ...turn, state: { kind: "live", status: "failed" } }));
        } else {
          patchTurn(turnId, (turn) => ({
            ...turn,
            state: { kind: "live", status: "failed" },
            finishedAt: Date.now(),
            error: hermes,
          }));
        }
      } finally {
        buffer.cancel();
        if (thinkingTimer !== undefined) clearTimeout(thinkingTimer);
        // Só a NOSSA promessa. Um acompanhamento antigo terminando depois de uma troca de
        // conversa não pode apagar a promessa de criação do turno que já começou na conversa
        // nova — `Parar` logo após enviar depende dela para achar o `run_id`.
        if (startingRef.current === starting) startingRef.current = undefined;
        if (mountedRef.current) {
          patchState((previous) =>
            previous.liveTurnId === turnId
              ? { ...previous, liveTurnId: undefined, thinking: false, liveStream: false, activeTool: undefined }
              : previous,
          );
        }
      }
    },
    [patch, patchTurn, streamResponses],
  );

  /** Reanexa a run aceita que sobreviveu ao fechamento, sem criar um segundo POST. */
  useEffect(() => {
    const sessionId = sessionIdRef.current;
    if (state.isLoadingHistory || sessionId === undefined) return;
    let cancelled = false;
    void (async () => {
      const stored = await listStoredRuns();
      const candidate = stored.find(
        (run) =>
          run.sessionId === sessionId &&
          run.turnId !== undefined &&
          run.expired !== true &&
          !isTerminalRunStatus(run.status ?? run.lastKnownStatus),
      );
      if (cancelled || candidate === undefined || candidate.turnId === undefined) return;
      const turnId = candidate.turnId;
      if (!turnsRef.current.some((turn) => turn.id === turnId)) {
        patch((previous) => ({
          ...previous,
          turns: [
            ...previous.turns,
            {
              id: turnId,
              message: candidate.promptPreview,
              answer: "",
              steps: [],
              queuedAt: candidate.createdAt,
              transportPhase: "accepted",
              state: {
                kind: "live",
                runId: candidate.runId,
                status: (candidate.status ?? candidate.lastKnownStatus) as RunStatus,
              },
            },
          ],
        }));
      }
      if (startedRef.current.has(turnId)) return;
      startedRef.current.add(turnId);
      void runTurn(turnId, candidate.promptPreview, candidate);
    })().catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [epoch, listStoredRuns, patch, runTurn, state.isLoadingHistory]);

  /**
   * A fila (§7). Nada dispara aqui dentro por conta própria: este efeito só reage à lista
   * de turnos, e `nextQueued` é quem diz se pode. `startedRef` garante que um turno nunca
   * roda duas vezes — inclusive sob o duplo-invoke do StrictMode.
   */
  useEffect(() => {
    const forcedId = forcedRef.current;
    const target = pickTurnToRun(state.turns, forcedId);

    if (forcedId !== undefined) {
      // A marca de `Tentar novamente` só é solta quando foi ATENDIDA ou quando ficou órfã.
      // Enquanto o turno pedido continua na fila esperando o turno vivo terminar, a marca
      // fica: é ela que impede a varredura da §7 de cancelar justamente o que o usuário
      // mandou repetir. Soltá-la cedo demais transformava um pedido explícito em silêncio.
      const stillQueued = state.turns.some((turn) => turn.id === forcedId && turn.state.kind === "queued");
      if (!stillQueued || target?.id === forcedId) forcedRef.current = undefined;
    }

    if (target === undefined || startedRef.current.has(target.id)) return;
    if (schedulerPendingRef.current === target.id) schedulerPendingRef.current = undefined;
    startedRef.current.add(target.id);
    void runTurn(target.id, target.message);
  }, [state.turns, runTurn]);

  /**
   * §7: se o turno em curso falhou ou foi cancelado, o que estava na fila NÃO dispara. Os
   * turnos ficam com o rótulo `Cancelled` e dizem por que não saíram daqui.
   *
   * Roda DEPOIS do efeito de disparo, e a ordem importa: `startedRef` já contém o turno que
   * o efeito anterior acabou de disparar, e é isso que impede esta varredura de cancelar,
   * no mesmo instante, o turno que o usuário mandou repetir.
   */
  useEffect(() => {
    const swept = cancelBlockedQueue(state.turns, startedRef.current);
    if (swept === state.turns) return;
    patch((previous) => (previous.turns === state.turns ? { ...previous, turns: [...swept] } : previous));
  }, [state.turns, patch]);

  /* ─────────────────────────── Ações da tela ─────────────────────────── */

  const send = useCallback(
    (message: string): string | undefined => {
      const text = message.trim();
      if (text === "") {
        // §6 do desenho: `Enviar` continua no painel com a barra vazia, e nesse caso avisa
        // em vez de enviar. Tirar a ação do painel promoveria outra a primária, e `Enter`
        // numa barra vazia passaria a copiar ou a trocar de modo, sem aviso.
        // Literal da §2.1.1, o mesmo da validação do formulário de antes.
        void showToast({ style: Toast.Style.Failure, title: "Write your question." });
        return undefined;
      }
      const id = newTurnId();
      // Com a conversa parada, isto não é um item de fila: é um envio explícito da pessoa,
      // agora. A recusa de "não disparar em cima de um erro" (§7) existe só para o que JÁ
      // estava esperando quando o turno anterior acabou mal — sem esta marca ela engolia
      // também a mensagem seguinte, que nascia `Cancelled` com uma explicação falsa e
      // deixava a conversa sem saída depois de qualquer falha ou de um `Parar`.
      // R9 continua de pé, e a guarda é mais larga que `isTurnLive` de propósito: um turno
      // recém-disparado ainda aparece `queued` até o `patchTurn` comitar. Sem contar também
      // os que já estão em `startedRef`, dois envios coladinhos poderiam virar duas execuções
      // na mesma conversa — que o servidor aceita e que custa caro (D-09).
      const conversaParada = !turnsRef.current.some(
        (turn) => isTurnLive(turn) || (turn.state.kind === "queued" && startedRef.current.has(turn.id)),
      );
      if (conversaParada && schedulerPendingRef.current === undefined) {
        forcedRef.current = id;
        schedulerPendingRef.current = id;
      }
      const queuedAt = Date.now();
      patch((previous) => ({
        ...previous,
        turns: [
          ...previous.turns,
          { id, message: text, answer: "", steps: [], queuedAt, transportPhase: "not_sent", state: { kind: "queued" } },
        ],
      }));
      void rememberQueuedTurn({
        schemaVersion: 1,
        id,
        sessionId: sessionIdRef.current,
        message: text,
        createdAt: queuedAt,
      }).catch(() => undefined);
      return id;
    },
    [patch],
  );

  const dequeue = useCallback(
    (turnId: string): void => {
      patch((previous) => ({
        ...previous,
        turns: previous.turns.filter((turn) => !(turn.id === turnId && turn.state.kind === "queued")),
      }));
      void removeQueuedTurn(turnId).catch(() => undefined);
    },
    [patch],
  );

  const retry = useCallback(
    (turnId: string): void => {
      // Intenção explícita do usuário: fura a recusa de "não disparar depois de erro".
      forcedRef.current = turnId;
      startedRef.current.delete(turnId);
      patchTurn(turnId, (turn) => ({
        ...turn,
        answer: "",
        steps: [],
        state: { kind: "queued" },
        transportPhase: "not_sent",
        startedAt: undefined,
        finishedAt: undefined,
        error: undefined,
        expired: false,
      }));
      void rememberQueuedTurn({
        schemaVersion: 1,
        id: turnId,
        sessionId: sessionIdRef.current,
        message: turnsRef.current.find((turn) => turn.id === turnId)?.message ?? "",
        createdAt: Date.now(),
      }).catch(() => undefined);
      patch((previous) => ({ ...previous, fatalError: undefined, streamFailure: undefined }));
    },
    [patch, patchTurn],
  );

  const stop = useCallback(async (): Promise<void> => {
    // `Parar` já aparece no primeiro quadro, mas `runIdRef` só é preenchido quando a
    // criação volta do servidor. `startingRef` guarda a promessa ÚNICA de criação, então dá
    // para esperar por ela e parar de verdade — em vez de virar um no-op silencioso
    // justamente na janela em que o usuário mais tenta parar.
    const pending = startingRef.current;
    if (runIdRef.current === undefined && pending === undefined) return;
    const operationEpoch = conversationEpochRef.current;

    const toast = await showToast({ style: Toast.Style.Animated, title: "Stopping the task…" });
    // O ref só é sincronizado no render seguinte; parar logo depois de enviar cai justamente
    // nessa janela, então a lista de turnos é a segunda fonte.
    const initialLiveId = liveTurnIdRef.current ?? turnsRef.current.find(isTurnLive)?.id;
    stopRequestedRef.current = true;
    patch((previous) => ({ ...previous, stopRequested: true }));
    if (initialLiveId !== undefined) {
      patchTurn(initialLiveId, (turn) =>
        turn.state.kind === "live" && !isTerminalRunStatus(turn.state.status)
          ? { ...turn, state: { ...turn.state, status: "stopping" } }
          : turn,
      );
    }

    let runId = runIdRef.current;
    if (runId === undefined && pending !== undefined) {
      try {
        runId = (await pending).runId;
      } catch {
        // A criação falhou por conta própria; o turno já publica esse erro.
        await toast.hide();
        patch((previous) => ({ ...previous, stopRequested: false }));
        return;
      }
    }
    if (runId === undefined) {
      await toast.hide();
      patch((previous) => ({ ...previous, stopRequested: false }));
      return;
    }
    if (conversationEpochRef.current !== operationEpoch) {
      await toast.hide();
      return;
    }

    // O turno recém-adicionado pode ainda não ter chegado aos refs sincronizados pelo
    // render quando `Parar` foi clicado. Resolva o alvo novamente depois da criação, pelo
    // run_id confirmado, em vez de abandonar o stop por uma leitura defasada.
    const liveId =
      initialLiveId ??
      liveTurnIdRef.current ??
      turnsRef.current.find(
        (turn) => turn.state.kind === "live" && (turn.state.runId === undefined || turn.state.runId === runId),
      )?.id;

    try {
      await stopRun(runId);
      toast.style = Toast.Style.Success;
      toast.title = "Task stopped";
    } catch (err) {
      const hermes = toHermesError(err, `POST /v1/runs/${runId}/stop`);
      if (hermes.httpStatus === 404) {
        // A run já tinha terminado: isso não é erro (§6.6 item 4).
        toast.style = Toast.Style.Success;
        toast.title = "Task stopped";
        if (liveId !== undefined) {
          patchTurn(liveId, (turn) =>
            turn.state.kind === "live" && !isTerminalRunStatus(turn.state.status)
              ? { ...turn, state: { ...turn.state, status: "cancelled" }, finishedAt: turn.finishedAt ?? Date.now() }
              : turn,
          );
        }
      } else {
        toast.style = Toast.Style.Failure;
        toast.title = hermes.userMessage;
      }
    }

    // Sem stream vivo não chega `run.cancelled`: acorda o ciclo de consulta na hora.
    if (!streamingRef.current) wakeRef.current?.abort();
  }, [patch, patchTurn]);

  const steer = useCallback(
    async (text: string): Promise<void> => {
      const runId = runIdRef.current;
      const liveId = liveTurnIdRef.current;
      const operationEpoch = conversationEpochRef.current;
      if (runId === undefined) return;
      try {
        await steerRun(runId, text);
        if (conversationEpochRef.current !== operationEpoch || liveTurnIdRef.current !== liveId) return;
        if (liveId !== undefined) {
          patchTurn(liveId, (turn) => ({ ...turn, steps: [...turn.steps, "🧭 Guidance sent"] }));
        }
        await showHUD("Guidance sent");
      } catch (err) {
        const hermes = toHermesError(err, `POST /v1/runs/${runId}/steer`);
        await showToast({ style: Toast.Style.Failure, title: hermes.userMessage });
      }
    },
    [patchTurn],
  );

  /** `Acompanhar de novo` (E23): reassina o stream da MESMA run, nunca dispara outra. */
  const reattach = useCallback((): void => {
    reattachRef.current = true;
    wakeRef.current?.abort();
  }, []);

  const approvalResolved = useCallback(
    (resolved: number): void => {
      approvalsPendingRef.current = Math.max(0, approvalsPendingRef.current - Math.max(resolved, 1));
      const stillPending = approvalsPendingRef.current > 0;
      if (!stillPending && approvalRunIdRef.current !== undefined) {
        void clearApprovalRequest(approvalRunIdRef.current).catch(() => undefined);
        approvalRunIdRef.current = undefined;
      }
      const liveId = liveTurnIdRef.current;
      if (liveId !== undefined && !stillPending) {
        patchTurn(liveId, (turn) =>
          turn.state.kind === "live" && turn.state.status === "waiting_for_approval"
            ? { ...turn, state: { ...turn.state, status: "running" } }
            : turn,
        );
      }
      patch((previous) => ({
        ...previous,
        approval:
          stillPending && previous.approval
            ? { ...previous.approval, pendingCount: approvalsPendingRef.current }
            : undefined,
      }));
    },
    [patch, patchTurn],
  );

  const switchSession = useCallback((sessionId: string | undefined, title?: string): void => {
    // Só os leitores locais são abortados. A run continua no Hermes (D-02) e reaparece em
    // `Execuções do Hermes` — trocar de conversa nunca cancela uma tarefa.
    abortRef.current.abort();
    abortRef.current = new AbortController();
    conversationEpochRef.current = nextConversationEpoch(conversationEpochRef.current);

    messagesRef.current = [];
    oldestMessageIdRef.current = Number.MAX_SAFE_INTEGER;
    startedRef.current = new Set();
    forcedRef.current = undefined;
    runIdRef.current = undefined;
    startingRef.current = undefined;
    approvalsPendingRef.current = 0;
    // A CHAVE gravada fica: trocar de conversa não resolve a aprovação, e a run continua
    // esperando. Só o ponteiro local é solto (D-02).
    approvalRunIdRef.current = undefined;
    streamingRef.current = false;
    reattachRef.current = false;
    schedulerPendingRef.current = undefined;
    stopRequestedRef.current = false;
    wakeRef.current = undefined;
    sessionIdRef.current = sessionId;
    targetRef.current = { sessionId, explicit: true };

    setState((previous) => ({
      ...previous,
      turns: [],
      sessionId,
      sessionTitle: title,
      isLoadingHistory: sessionId !== undefined,
      serverHasMore: false,
      historyFailed: false,
      renderCap: RENDER_TURN_LIMIT,
      liveTurnId: undefined,
      thinking: false,
      liveStream: false,
      stopRequested: false,
      activeTool: undefined,
      approval: undefined,
      streamFailure: undefined,
      fatalError: undefined,
      model: undefined,
      usage: undefined,
      runId: undefined,
      baseUrl: previous.baseUrl,
      newConversation: false,
      pendingSteer: undefined,
    }));
    setEpoch((value) => value + 1);
  }, []);

  const setSessionTitle = useCallback(
    (title: string | undefined): void => {
      patch((previous) => ({ ...previous, sessionTitle: title }));
    },
    [patch],
  );

  /** §8.6: o argumento do comando vira o primeiro turno, sem passar por tela nenhuma. */
  useEffect(() => {
    const initial = (options.initialMessage ?? "").trim();
    if (initial === "" || sentInitialRef.current) return;
    sentInitialRef.current = true;
    send(initial);
  }, [options.initialMessage, send]);

  /* ───────────────────────── O que a tela recebe ───────────────────────── */

  const visible = useMemo(
    () => (state.turns.length > state.renderCap ? state.turns.slice(-state.renderCap) : state.turns),
    [state.turns, state.renderCap],
  );

  return {
    turns: visible,
    sessionId: state.sessionId,
    sessionTitle: state.sessionTitle,
    isLoadingHistory: state.isLoadingHistory,
    hasOlder: state.serverHasMore || state.turns.length > state.renderCap,
    historyFailed: state.historyFailed,
    liveTurnId: state.liveTurnId,
    thinking: state.thinking,
    liveStream: state.liveStream,
    stopRequested: state.stopRequested,
    activeTool: state.activeTool,
    approval: state.approval,
    streamFailure: state.streamFailure,
    fatalError: state.fatalError,
    model: state.model,
    runId: state.runId,
    baseUrl: state.baseUrl,
    newConversation: state.newConversation,
    pendingSteer: state.pendingSteer,
    send,
    dequeue,
    stop,
    steer,
    reattach,
    retry,
    approvalResolved,
    loadOlder,
    switchSession,
    setSessionTitle,
  };
}
