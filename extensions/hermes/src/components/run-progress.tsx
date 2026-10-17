/**
 * `RunProgressView` — acompanhar uma execução do Hermes que JÁ EXISTE.
 *
 * A diferença para `useRunStream` (`src/hooks/use-run-stream.ts`, o motor de
 * `Perguntar ao Hermes`) é o ponto de partida: lá a tela cria a run e assina o stream na
 * hora; aqui a tela recebe um `run_id` que pode ter nascido em outra janela, em outro dia,
 * ou até no Hermes Desktop. É o caso de `Execuções do Hermes` e o da tarefa longa que o
 * usuário reabre depois de fechar o Raycast.
 *
 * Por isso o stream é OPCIONAL (`attachStream`): o transporte de eventos tem consumidor
 * único e não é retomável — reconectar devolve 404 embora a run siga viva (armadilhas 14 e
 * 16). Quando não há stream, o acompanhamento é `GET /v1/runs/{id}` a cada 2 s (§8.5).
 *
 * O que esta tela NÃO faz, de propósito, porque já existe em um lugar só:
 * - a tabela de atalhos vem de `./shortcuts`;
 * - a tela de aprovação vem de `./approval-view`;
 * - a tela de primeiro uso vem de `./not-configured`;
 * - os rótulos dos 7 estados vêm de `src/lib/status.ts`;
 * - HTTP, SSE e mapeamento de erro vêm de `src/lib/`.
 */

import {
  Action,
  ActionPanel,
  Clipboard,
  Color,
  Detail,
  Icon,
  LaunchType,
  Toast,
  launchCommand,
  openExtensionPreferences,
  showHUD,
  showToast,
} from "@raycast/api";
import { useEffect, useReducer, useRef, useState, type ReactElement } from "react";

import { hermesDesktopSessionUrl } from "../lib/discovery";
import { canContinueConversation } from "../lib/conversation-lifecycle";
import { HermesError, isAbort, sanitizeTechnical, toHermesError } from "../lib/errors";
import { forkSession, getRun, openRunEventStream, reconcileRun, stopRun } from "../lib/hermes-api";
import { consumeRunEventStream, createTextBuffer, type RunStreamResult } from "../lib/hermes-events";
import { getHermesPreferences } from "../lib/preferences";
import {
  APPROVAL_CHOICE_LABEL,
  NO_CONNECTION,
  RUN_EXPIRED,
  RUN_EXPIRED_DETAIL,
  RUN_STATUS_APPEARANCE,
  RUN_STATUS_LABEL,
  isTerminalRunStatus,
  runStatusAppearance,
  runStatusLabel,
  type StatusAppearance,
} from "../lib/status";
import {
  clearApprovalRequest,
  loadApprovalRequest,
  loadRunResult,
  saveApprovalRequest,
  saveRunResult,
  updateStoredRun,
  type StoredApproval,
} from "../lib/storage";
import type { ApprovalChoice, ApprovalRequestFields, HermesUsage, Run } from "../lib/types";
import { ApprovalView } from "./approval-view";
import { RenameSessionForm } from "./rename-session-form";
import { SteerForm, steerAndReport } from "./steer-form";
import { SHORTCUTS } from "./shortcuts";
import { OpenModelsAction } from "./common";

/** UX-SPEC §8.5: 2 s para a execução aberta, enquanto o estado não for terminal. */
export const RUN_POLL_MS = 2_000;

/** UX-SPEC §6.1: a única troca de texto automática da tela. */
const THINKING_AFTER_MS = 3_000;

/* ═══════════════════════════ Utilidades de exibição ═══════════════════════════ */

/**
 * `status.ts` guarda ícone e cor como o VALOR literal do enum, para poder ser carregado sob
 * `node --test` (onde `@raycast/api` não tem runtime). Aqui os valores voltam ao tipo do
 * enum: a asserção é segura porque `status.ts` amarra cada literal ao membro real em tempo
 * de compilação (`satisfies IconMembers` / `satisfies ColorMembers`), então um nome
 * inventado ou um valor que mude de string não compilaria lá.
 */
export function statusImage(appearance: StatusAppearance): { source: Icon; tintColor: Color.ColorLike } {
  return { source: appearance.icon as Icon, tintColor: appearance.color as Color.ColorLike };
}

/**
 * A mesma travessia, para as posições que pedem `icon` e `color` em props separadas —
 * hoje só `Detail.Metadata.TagList.Item`, cujo `color` também aceita `Color.ColorLike`
 * (`types/index.d.ts:8399`). Existe para que NENHUM ponto da interface leia
 * `appearance.color` cru: assim a paleta pode mudar de forma sem vazar para o JSX.
 */
export function tagTone(appearance: StatusAppearance): { icon: Icon; color: Color.ColorLike } {
  return { icon: appearance.icon as Icon, color: appearance.color as Color.ColorLike };
}

/** Primeira linha do texto, colapsada e cortada, para cabeçalhos e títulos de item. */
export function shorten(text: string, max: number): string {
  const clean = text.replace(/\s+/g, " ").trim();
  return clean.length <= max ? clean : `${clean.slice(0, max).trimEnd()}…`;
}

/** Número com ponto decimal, como manda o inglês. */
function decimal(value: number, digits = 1): string {
  return value.toLocaleString("en-US", { minimumFractionDigits: digits, maximumFractionDigits: digits });
}

/**
 * Armadilha 19 / UX-SPEC §4.4: `waiting_for_approval` GRUDA no `GET /v1/runs/{id}` depois
 * de a aprovação ter sido respondida em outro aplicativo. O desempate é o `last_event` do
 * próprio servidor — quando o último evento já não é o pedido, o run está andando.
 *
 * Não usar um trinco local ("já vi um evento posterior"): sem stream (`attachStream`
 * `false`) nenhum evento chega, o trinco nunca destrava e o segundo pedido de aprovação da
 * mesma tarefa fica invisível para sempre, com a run bloqueada até o timeout de 300 s.
 */
export function effectiveRunStatus(run: Run): string {
  if (run.status === "waiting_for_approval" && run.last_event !== undefined && run.last_event !== "approval.request") {
    return "running";
  }
  return run.status;
}

/**
 * `StoredApproval` (o que sobrevive ao fechamento da janela) de volta ao formato do evento,
 * que é o que a tela de aprovação lê. O `as` é necessário porque o índice local guarda
 * `choices` como `string[]`: um valor novo que o servidor passe a emitir não pode derrubar a
 * leitura do registro, e a tela de aprovação ignora `choice` que não reconhece.
 */
export function approvalFields(stored: StoredApproval | undefined): ApprovalRequestFields {
  return {
    command: stored?.command,
    description: stored?.description,
    choices: (stored?.choices ?? ["deny"]) as ApprovalChoice[],
    request_id: stored?.requestId,
    pattern_key: stored?.patternKey,
    pattern_keys: stored?.patternKeys,
    smart_denied: stored?.smartDenied,
  };
}

/* ════════════════════════════ Detalhes técnicos ════════════════════════════ */

export interface TechnicalContext {
  runId: string;
  sessionId?: string;
  status?: string;
  lastEvent?: string;
  error?: HermesError;
}

/**
 * Bloco de "Detalhes técnicos" no formato da UX-SPEC §5.1, oculto por padrão em toda tela.
 * Passa SEMPRE por `sanitizeTechnical()`: a regra 5 da spec proíbe pular o filtro, inclusive
 * quando a chave nem está carregada, e este é o único texto da tela que carrega conteúdo
 * vindo do servidor.
 */
export function technicalDetails(ctx: TechnicalContext): string {
  const lines = [
    `Task id: ${ctx.runId}`,
    ctx.sessionId !== undefined ? `Conversation: ${ctx.sessionId}` : undefined,
    ctx.status !== undefined ? `State: ${ctx.status}` : undefined,
    ctx.lastEvent !== undefined ? `Last event: ${ctx.lastEvent}` : undefined,
    ctx.error?.httpStatus !== undefined ? `Answer: ${ctx.error.httpStatus}` : undefined,
    ctx.error?.code ? `Code: ${ctx.error.code}` : undefined,
    ctx.error !== undefined ? `Detail: ${ctx.error.technical}` : undefined,
    `Moment: ${new Date().toLocaleString("en-US")}`,
  ].filter((line): line is string => line !== undefined);

  return sanitizeTechnical(lines.join("\n"));
}

function technicalMarkdown(ctx: TechnicalContext): string {
  return ["### Technical details", "", "```", technicalDetails(ctx), "```"].join("\n");
}

/* ═══════════════════════════ Tela de erro reutilizável ═══════════════════════════ */

export function ErrorDetail(props: {
  navigationTitle: string;
  error: HermesError;
  technicalContext: TechnicalContext;
  onRetry?: () => void;
}): ReactElement {
  const [showTechnical, setShowTechnical] = useState(false);
  const ctx: TechnicalContext = { ...props.technicalContext, error: props.error };
  const markdown = [props.error.userMessage, showTechnical ? technicalMarkdown(ctx) : undefined]
    .filter((block): block is string => block !== undefined)
    .join("\n\n");

  return (
    <Detail
      navigationTitle={props.navigationTitle}
      markdown={markdown}
      metadata={
        /* `Detail` não tem prop de ícone; o veículo é a metadata. Sem isto a tela de erro
           era um bloco de texto sem nenhum sinal visual.
           O rótulo NÃO é adivinhado: `recovery === "start_hermes"` é a própria
           classificação de "o Hermes não está no ar", e só nesse caso a condição é
           "No connection" (§4.3) — nos demais o que houve foi uma falha, e chamar tudo de
           "No connection" seria mentir sobre a causa. O par ícone+cor sai de `status.ts`. */
        <Detail.Metadata>
          <Detail.Metadata.TagList title="State">
            {props.error.recovery === "start_hermes" ? (
              <Detail.Metadata.TagList.Item text={NO_CONNECTION.label} {...tagTone(NO_CONNECTION)} />
            ) : (
              <Detail.Metadata.TagList.Item text={RUN_STATUS_LABEL.failed} {...tagTone(RUN_STATUS_APPEARANCE.failed)} />
            )}
          </Detail.Metadata.TagList>
        </Detail.Metadata>
      }
      actions={
        <ActionPanel>
          {props.onRetry !== undefined && (
            <Action
              title="Try Again"
              icon={Icon.ArrowClockwise}
              shortcut={SHORTCUTS.refresh}
              onAction={props.onRetry}
            />
          )}
          <Action
            title="Open Settings"
            icon={Icon.Gear}
            shortcut={SHORTCUTS.preferences}
            onAction={openExtensionPreferences}
          />
          <Action
            title={showTechnical ? "Hide Technical Details" : "Show Technical Details"}
            icon={showTechnical ? Icon.EyeDisabled : Icon.Eye}
            shortcut={SHORTCUTS.showTechnical}
            onAction={() => setShowTechnical(!showTechnical)}
          />
          <Action.CopyToClipboard
            title="Copy Technical Details"
            content={technicalDetails(ctx)}
            shortcut={SHORTCUTS.copyTechnical}
          />
        </ActionPanel>
      }
    />
  );
}

/* ══════════════════════════════ Estado da tela ══════════════════════════════ */

export type ViewMode = "etapas" | "resposta";

interface Step {
  id: number;
  line: string;
}

interface RunViewState {
  status?: string;
  /** `GET /v1/runs/{id}` devolveu 404: é condição, não estado (UX-SPEC §4.3). */
  expired: boolean;
  text: string;
  steps: Step[];
  nextStepId: number;
  /** Ferramenta rodando agora; some no `tool.completed` (UX-SPEC §6.3). */
  currentTool?: string;
  /** Nomes distintos das ferramentas usadas, para a TagList "Etapas". */
  tools: string[];
  approval?: StoredApproval;
  approvalLoaded: boolean;
  pendingApprovals: number;
  runError?: string;
  pendingSteer?: string;
  usage?: HermesUsage;
  startedAt: number;
  durationSeconds?: number;
  model?: string;
  sessionId?: string;
  /** Erro que toma a tela inteira (UX-SPEC §5.3). */
  screenError?: HermesError;
  /** Avisos em bloco de citação, acumulados no topo do markdown. */
  notices: string[];
  stopping: boolean;
  isLoading: boolean;
}

type RunViewAction =
  | { type: "text"; text: string }
  | { type: "tool-started"; tool: string; preview: string | null }
  | { type: "tool-completed"; tool: string; duration: number; failed: boolean }
  | { type: "reasoning"; text: string }
  | { type: "subagent"; line: string }
  | { type: "approval-request"; approval: StoredApproval }
  | { type: "approval-loaded"; approval?: StoredApproval }
  | { type: "approval-responded"; choice: ApprovalChoice; resolved: number }
  | { type: "steered" }
  | { type: "polled"; run: Run }
  | { type: "expired" }
  | { type: "stream-result"; result: RunStreamResult }
  | { type: "stopping" }
  | { type: "notice"; text: string }
  | { type: "screen-error"; error: HermesError }
  | { type: "loaded" };

function withStep(state: RunViewState, line: string): RunViewState {
  return { ...state, steps: [...state.steps, { id: state.nextStepId, line }], nextStepId: state.nextStepId + 1 };
}

function withNotice(state: RunViewState, text: string): RunViewState {
  return state.notices.includes(text) ? state : { ...state, notices: [...state.notices, text] };
}

function reduce(state: RunViewState, action: RunViewAction): RunViewState {
  switch (action.type) {
    case "text":
      return { ...state, text: action.text, isLoading: false };

    case "tool-started": {
      const line = action.preview ? `🔧 Using ${action.tool} — ${action.preview}` : `🔧 Using ${action.tool}`;
      const tools = state.tools.includes(action.tool) ? state.tools : [...state.tools, action.tool];
      return withStep({ ...state, currentTool: action.tool, tools }, line);
    }

    case "tool-completed": {
      // Armadilha 28: falha de ferramenta chega como `tool.completed` com `error: true`.
      const line = action.failed
        ? `⚠️ ${action.tool} failed after ${decimal(action.duration)} s`
        : `✅ ${action.tool} finished in ${decimal(action.duration)} s`;
      const currentTool = state.currentTool === action.tool ? undefined : state.currentTool;
      return withStep({ ...state, currentTool }, line);
    }

    case "reasoning":
      return withStep(state, `💭 ${shorten(action.text, 100)}`);

    case "subagent":
      return withStep(state, action.line);

    case "approval-request":
      return withStep(
        {
          ...state,
          approval: action.approval,
          approvalLoaded: true,
          pendingApprovals: state.pendingApprovals + 1,
          status: "waiting_for_approval",
        },
        "🔐 Hermes asked for your approval",
      );

    case "approval-loaded":
      return {
        ...state,
        approval: action.approval,
        approvalLoaded: true,
        pendingApprovals: Math.max(state.pendingApprovals, 1),
      };

    case "approval-responded": {
      const resolved = Math.max(action.resolved, 1);
      return withStep(
        {
          ...state,
          approval: undefined,
          approvalLoaded: false,
          pendingApprovals: Math.max(state.pendingApprovals - resolved, 0),
          // Destrava a UI na hora; o polling seguinte confirma pelo `last_event` do
          // servidor, que é o desempate da armadilha 19.
          status: "running",
        },
        `🔐 Approval answered: ${APPROVAL_CHOICE_LABEL[action.choice]}`,
      );
    }

    case "steered":
      return withStep(state, "🧭 Guidance sent");

    case "polled": {
      const run = action.run;
      const terminal = isTerminalRunStatus(run.status);
      return {
        ...state,
        expired: false,
        status: effectiveRunStatus(run),
        model: run.model ?? state.model,
        sessionId: run.session_id ?? state.sessionId,
        usage: run.usage ?? state.usage,
        pendingSteer: run.pending_steer ?? state.pendingSteer,
        runError: run.error ?? state.runError,
        // O texto do polling só entra quando a run terminou: durante o stream, o acumulado
        // dos deltas é mais recente que qualquer coisa que o GET devolva.
        text: terminal && run.output !== undefined ? run.output : state.text,
        durationSeconds: terminal ? Math.max(run.updated_at - run.created_at, 0) : state.durationSeconds,
        currentTool: terminal ? undefined : state.currentTool,
        stopping: terminal ? false : state.stopping,
        isLoading: false,
      };
    }

    case "expired":
      // O 404 depois de um desfecho JÁ OBSERVADO não é "não sei o que aconteceu": é o
      // servidor tendo descartado (TTL de 1 h, §8.7) o registro de uma tarefa que nós vimos
      // terminar. Continuar mostrando `Concluído` com o resultado é a verdade — e é o que
      // `Execuções do Hermes` já faz, então sem esta linha a MESMA execução dizia
      // "Concluído" na lista e "Execução expirada" um Enter depois.
      if (state.status !== undefined && isTerminalRunStatus(state.status)) {
        return { ...state, currentTool: undefined, stopping: false, isLoading: false };
      }
      return { ...state, expired: true, currentTool: undefined, stopping: false, isLoading: false };

    case "stream-result": {
      const result = action.result;
      // Abortado = a tela está desmontando. A run continua no servidor (D-02).
      if (result.aborted) return state;
      const status =
        result.terminalEvent === "run.completed"
          ? "completed"
          : result.terminalEvent === "run.failed"
            ? "failed"
            : result.terminalEvent === "run.cancelled"
              ? "cancelled"
              : state.status;
      return {
        ...state,
        status,
        // O texto final autoritativo é o `output` do `run.completed` (UX-SPEC §6.2).
        text: result.output ?? (result.text !== "" ? result.text : state.text),
        usage: result.usage ?? state.usage,
        runError: result.error ?? state.runError,
        pendingSteer: result.pendingSteer ?? state.pendingSteer,
        currentTool: undefined,
        durationSeconds: isTerminalRunStatus(status) ? (Date.now() - state.startedAt) / 1000 : state.durationSeconds,
        isLoading: false,
      };
    }

    case "stopping":
      return { ...state, stopping: true, status: "stopping" };

    case "notice":
      return withNotice(state, action.text);

    case "screen-error":
      return { ...state, screenError: action.error, isLoading: false };

    case "loaded":
      return { ...state, isLoading: false };
  }
}

function initialState(props: RunProgressViewProps): RunViewState {
  return {
    expired: false,
    text: "",
    steps: [],
    nextStepId: 1,
    tools: [],
    approvalLoaded: false,
    pendingApprovals: 0,
    // Sem semente, `runStatusLabel(undefined)` pinta "Desconhecido" — um oitavo rótulo, que
    // a §4.1 não permite — até a primeira resposta do polling, e PARA SEMPRE com o Hermes
    // fora do ar. §2.1.4 e §6.1 mandam **Preparando** antes do primeiro token; quem reabre
    // uma execução já sabe o desfecho por `StoredRun.lastKnownStatus`.
    status: props.status,
    startedAt: props.createdAt ?? Date.now(),
    model: props.model,
    sessionId: props.sessionId,
    notices: [],
    stopping: false,
    isLoading: true,
  };
}

/* ══════════════════════════ Tela de acompanhamento ══════════════════════════ */

export interface RunProgressViewProps {
  runId: string;
  /** Texto da tarefa: vira cabeçalho e `navigationTitle`. */
  prompt: string;
  sessionId?: string;
  sessionTitle?: string;
  model?: string;
  createdAt?: number;
  /**
   * Estado conhecido no momento da abertura: `"queued"` para quem acabou de disparar a
   * tarefa, `StoredRun.lastKnownStatus` para quem reabre. Sem ele a tela mostra
   * `Estado: Desconhecido` (§4.1 só admite 7 rótulos).
   */
  status?: string;
  /**
   * `true` SOMENTE quando esta tela acabou de disparar a run. O stream de eventos tem
   * consumidor único e não é retomável: reconectar devolve 404 enquanto a run segue viva
   * (armadilhas 14 e 15). Ao REABRIR uma execução, a recuperação é o polling de 2 s.
   */
  attachStream: boolean;
  /** `run-task` abre em Etapas (UX-SPEC §2.4.2); `Ctrl+T` alterna. */
  initialMode?: ViewMode;
}

export function RunProgressView(props: RunProgressViewProps): ReactElement {
  const { runId, prompt, attachStream } = props;

  const [state, dispatch] = useReducer(reduce, props, initialState);
  const [mode, setMode] = useState<ViewMode>(props.initialMode ?? "resposta");
  const [showTechnical, setShowTechnical] = useState(false);
  const [thinking, setThinking] = useState(false);
  const [nonce, setNonce] = useState(0);
  const [renamedTitle, setRenamedTitle] = useState<string | undefined>(undefined);

  const title = renamedTitle ?? props.sessionTitle;

  const terminal = state.expired || isTerminalRunStatus(state.status);
  const sessionId = state.sessionId ?? props.sessionId;
  const canContinue = canContinueConversation(sessionId, terminal);
  const desktopUrl = hermesDesktopSessionUrl(sessionId);
  /** §6.2, último item: desligado, nada é pintado até o desfecho. */
  const { streamResponses } = getHermesPreferences();

  /** Lido dentro do polling sem entrar nas dependências: só decide ONDE o erro aparece. */
  const hasContentRef = useRef(false);
  hasContentRef.current = state.text !== "" || state.steps.length > 0;

  /**
   * O texto entra na gravação do resultado, mas NÃO nas dependências do efeito: com
   * `state.text` lá, cada descarga do buffer (80 ms) refazia o read-modify-write do índice
   * inteiro — ~12 reescritas por segundo, por toda a tarefa, sem nada ter mudado.
   */
  const textRef = useRef("");
  textRef.current = state.text;

  /* ── Stream de eventos: só na execução recém-criada ── */
  useEffect(() => {
    if (!attachStream) return;

    const controller = new AbortController();
    let cancelled = false;
    const buffer = createTextBuffer((text) => {
      if (!cancelled) dispatch({ type: "text", text });
    });

    void (async () => {
      try {
        const response = await openRunEventStream(runId, controller.signal);
        if (cancelled) return;

        const result = await consumeRunEventStream(
          response,
          runId,
          {
            // §6.2: com "Mostrar a resposta enquanto o Hermes escreve" desligado, o texto
            // só aparece no desfecho — que chega pelo `stream-result`/`polled`.
            onText: streamResponses ? buffer.push : undefined,
            onToolStarted: (tool, preview) => {
              if (!cancelled) dispatch({ type: "tool-started", tool, preview });
            },
            onToolCompleted: (tool, duration, failed) => {
              if (!cancelled) dispatch({ type: "tool-completed", tool, duration, failed });
            },
            onReasoning: (text) => {
              if (!cancelled) dispatch({ type: "reasoning", text });
            },
            onSubagent: (event) => {
              if (cancelled) return;
              if (event.event === "subagent.start") {
                dispatch({ type: "subagent", line: `👥 Helper task started: ${event.goal ?? "no description"}` });
              } else if (event.event === "subagent.complete") {
                dispatch({ type: "subagent", line: `👥 Helper task finished: ${event.summary ?? "no summary"}` });
              }
            },
            onApprovalRequest: (request) => {
              // Armadilha 24: não existe rota que liste aprovações pendentes. Gravar AGORA,
              // ou o usuário reabriria a tela sem enxergar o comando que está autorizando.
              const approval: StoredApproval = {
                runId,
                command: request.command,
                description: request.description,
                choices: request.choices ?? [],
                requestId: request.request_id,
                patternKey: request.pattern_key,
                patternKeys: request.pattern_keys,
                smartDenied: request.smart_denied,
                receivedAt: Date.now(),
              };
              void saveApprovalRequest(approval);
              if (!cancelled) dispatch({ type: "approval-request", approval });
            },
            onApprovalResponded: (choice, resolved) => {
              void clearApprovalRequest(runId);
              if (!cancelled) dispatch({ type: "approval-responded", choice, resolved });
            },
            onEvent: (event) => {
              if (!cancelled && event.event === "run.steered") dispatch({ type: "steered" });
            },
          },
          controller.signal,
        );

        buffer.flush();
        if (!cancelled) dispatch({ type: "stream-result", result });
      } catch (err) {
        buffer.cancel();
        if (cancelled || isAbort(err)) return;
        const error = toHermesError(err, "runEvents");
        // E9 e E23 nunca apagam o que o usuário já leu: viram aviso e o polling assume.
        dispatch({
          type: "notice",
          text:
            error.httpStatus === 404
              ? "I lost the live view of this task, but it is still going inside Hermes."
              : "The connection to Hermes dropped in the middle of the answer. The task is still going inside Hermes.",
        });
      }
    })();

    return () => {
      cancelled = true;
      buffer.cancel();
      controller.abort(); // ÚNICO lugar que desliga o stream
    };
  }, [runId, attachStream]);

  /* ── Polling de 2 s (UX-SPEC §8.5). Um comando `view` só vive em primeiro plano: ao
        fechar a janela o componente desmonta e o cleanup abaixo encerra o ciclo. ── */
  useEffect(() => {
    if (terminal) return;

    const controller = new AbortController();
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;

    const tick = async (): Promise<void> => {
      try {
        const run = await reconcileRun(runId, controller.signal);
        if (cancelled) return;
        // Armadilha 17: 404 é "expirado/perdido", jamais "falhou".
        if (run === "expired") {
          // Marcar no índice: `lastKnownStatus` ficaria em `running` por até 7 dias e o
          // banner "Você tem N tarefas em andamento" contaria uma execução que sumiu.
          void updateStoredRun(runId, { expired: true });
          dispatch({ type: "expired" });
        } else dispatch({ type: "polled", run });
      } catch (err) {
        if (cancelled || isAbort(err)) return;
        const error = toHermesError(err, "getRun");
        // Sem nada na tela, o erro toma a tela; com conteúdo, vira aviso e o ciclo
        // seguinte tenta de novo (UX-SPEC §5.3).
        if (hasContentRef.current) dispatch({ type: "notice", text: error.userMessage });
        else dispatch({ type: "screen-error", error });
      } finally {
        if (!cancelled) timer = setTimeout(() => void tick(), RUN_POLL_MS);
      }
    };

    void tick();

    return () => {
      cancelled = true;
      if (timer !== undefined) clearTimeout(timer);
      controller.abort();
    };
  }, [runId, terminal, state.status, nonce]);

  /* ── Aprovação pendente reaberta: o payload só existe no LocalStorage (armadilha 24) ── */
  useEffect(() => {
    if (state.status !== "waiting_for_approval" || state.approvalLoaded) return;
    let cancelled = false;
    void loadApprovalRequest(runId).then((stored) => {
      if (!cancelled) dispatch({ type: "approval-loaded", approval: stored });
    });
    return () => {
      cancelled = true;
    };
  }, [runId, state.status, state.approvalLoaded]);

  /* ── Resultado gravado localmente: o servidor descarta o estado terminal em 1 h (§8.7) ── */
  useEffect(() => {
    if (state.status === undefined) return;
    void updateStoredRun(runId, { lastKnownStatus: state.status });
    if (!isTerminalRunStatus(state.status)) return;
    // Nada a registrar ainda (execução reaberta antes de o resultado gravado carregar):
    // gravar aqui apagaria com `undefined` o `output` que já estava no LocalStorage.
    if (textRef.current === "" && state.runError === undefined) return;
    void saveRunResult({
      runId,
      status: state.status,
      // Do ref, não do estado: ver `textRef`. O valor lido aqui é o mesmo que está na tela.
      output: textRef.current !== "" ? textRef.current : undefined,
      error: state.runError,
      savedAt: Date.now(),
    });
  }, [runId, state.status, state.runError]);

  /* ── Execução reaberta: mostra o resultado que já tínhamos, sem esperar o servidor ── */
  useEffect(() => {
    if (attachStream || state.text !== "") return;
    let cancelled = false;
    void loadRunResult(runId).then((stored) => {
      if (cancelled) return;
      if (stored?.output) dispatch({ type: "text", text: stored.output });
      else dispatch({ type: "loaded" });
    });
    return () => {
      cancelled = true;
    };
  }, [runId, attachStream, state.text]);

  /* ── UX-SPEC §6.1: "Preparando…" vira "O Hermes está pensando…" depois de 3 s ── */
  useEffect(() => {
    if (state.text !== "" || terminal) return;
    const timer = setTimeout(() => setThinking(true), THINKING_AFTER_MS);
    return () => clearTimeout(timer);
  }, [state.text, terminal]);

  const technicalContext: TechnicalContext = {
    runId,
    sessionId,
    status: state.expired ? "run_not_found" : state.status,
    error: state.screenError,
  };

  function refresh(): void {
    setNonce((value) => value + 1);
  }

  /**
   * §6.4 item 3 — `Continuar esta conversa`. Vai por `launchCommand` com o `session_id` no
   * contexto (o mesmo caminho de `session-detail.tsx`): a continuação entra no MESMO
   * histórico que o Hermes Desktop mostra, em vez de abrir uma conversa nova.
   */
  async function continueConversation(): Promise<void> {
    if (!canContinue) return;
    try {
      await launchCommand({
        name: "ask-hermes",
        type: LaunchType.UserInitiated,
        context: { sessionId, sessionTitle: title },
      });
    } catch {
      await showToast({
        style: Toast.Style.Failure,
        title: "Could not open the question screen.",
        message: 'Search for "Ask Hermes" in Raycast.',
      });
    }
  }

  /** §6.4 item 7 — `Ramificar conversa`. */
  async function branch(): Promise<void> {
    if (sessionId === undefined) return;
    try {
      await forkSession(sessionId);
      await showToast({
        style: Toast.Style.Success,
        title: "New conversation created from this one",
        // O filho é carimbado `source: "api_server"` pelo servidor e não é patchável (R7).
        message: "This new conversation does not show up in the main Hermes Desktop list.",
      });
    } catch (err) {
      await showToast({
        style: Toast.Style.Failure,
        title: toHermesError(err, `POST /api/sessions/${sessionId}/fork`).userMessage,
      });
    }
  }

  async function handleStop(): Promise<void> {
    // Sem `confirmAlert`: a UX-SPEC §6.6 item 6 é explícita — nada é destruído e a
    // confirmação atrasaria a única saída de emergência do usuário.
    const toast = await showToast({ style: Toast.Style.Animated, title: "Stopping the task…" });
    try {
      await stopRun(runId);
      dispatch({ type: "stopping" });
      toast.style = Toast.Style.Success;
      toast.title = "Task stopped";
    } catch (err) {
      const error = toHermesError(err, "stopRun");
      if (error.httpStatus === 404) {
        // Armadilha 21: 404 aqui significa "a tarefa já tinha terminado", nunca erro.
        toast.style = Toast.Style.Success;
        toast.title = "Task stopped";
        refresh();
        return;
      }
      toast.style = Toast.Style.Failure;
      toast.title = error.userMessage;
    }
  }

  if (state.screenError !== undefined && !hasContentRef.current) {
    return (
      <ErrorDetail
        navigationTitle={shorten(prompt, 40)}
        error={state.screenError}
        technicalContext={technicalContext}
        onRetry={refresh}
      />
    );
  }

  const appearance = state.expired ? RUN_EXPIRED : runStatusAppearance(state.status);
  const label = state.expired ? RUN_EXPIRED.label : runStatusLabel(state.status);

  return (
    <Detail
      navigationTitle={shorten(prompt, 40)}
      isLoading={state.isLoading || !terminal}
      markdown={buildMarkdown({
        state,
        prompt,
        mode,
        thinking,
        terminal,
        showTechnical,
        technicalContext,
        attachStream,
      })}
      metadata={
        <Detail.Metadata>
          <Detail.Metadata.Label title="State" text={label} icon={statusImage(appearance)} />
          <Detail.Metadata.Label title="Conversation" text={title ?? "Untitled"} />
          <Detail.Metadata.Label title="Model" text={state.model ?? "Hermes default"} />
          {sessionId !== undefined && <Detail.Metadata.Label title="Sync" text="Shows up in Hermes Desktop" />}
          {state.durationSeconds !== undefined && (
            <Detail.Metadata.Label title="Duration" text={`${Math.round(state.durationSeconds)} s`} />
          )}
          {mode === "etapas" && state.tools.length > 0 && (
            <Detail.Metadata.TagList title="Steps">
              {state.tools.slice(-6).map((tool) => (
                <Detail.Metadata.TagList.Item key={tool} text={tool} />
              ))}
            </Detail.Metadata.TagList>
          )}
        </Detail.Metadata>
      }
      actions={
        <ActionPanel>
          <ActionPanel.Section>
            {state.status === "waiting_for_approval" && !terminal && (
              <Action.Push
                title="Answer the Approval Request"
                icon={Icon.Lock}
                target={
                  <ApprovalView
                    runId={runId}
                    fields={approvalFields(state.approval)}
                    pendingCount={Math.max(state.pendingApprovals, 1)}
                    detailsLost={state.approvalLoaded && state.approval === undefined}
                    taskPreview={shorten(prompt, 60)}
                    conversationTitle={title ?? "Untitled"}
                    sessionId={sessionId}
                    onResolved={(choice, resolved) => dispatch({ type: "approval-responded", choice, resolved })}
                    // §7.4: `See the Task Steps` — esta tela JÁ é a tarefa, então basta
                    // trocar o modo; o `Esc` do usuário volta para cá com as etapas à vista.
                    onShowSteps={() => setMode("etapas")}
                  />
                }
              />
            )}
            {terminal && state.text !== "" && (
              <Action.CopyToClipboard
                title="Copy the Answer"
                content={state.text}
                shortcut={SHORTCUTS.copy}
                onCopy={() => void showHUD("Answer copied")}
              />
            )}
            {terminal && state.text !== "" && (
              /* Mesma forma da tela de pergunta (`ask.tsx`): sem o `onPaste` a colagem
                 acontecia sem nenhuma confirmação visível, e o item 12 do checklist
                 ("cópia e colagem") reprovava só nesta tela. */
              <Action.Paste
                title="Paste into the Active App"
                icon={Icon.Text}
                content={state.text}
                shortcut={SHORTCUTS.paste}
                onPaste={() => void showHUD("Answer pasted")}
              />
            )}
            {!terminal && state.text !== "" && (
              <Action.CopyToClipboard
                title="Copy the Partial Answer"
                content={state.text}
                shortcut={SHORTCUTS.copy}
                onCopy={() => void showHUD("Answer copied")}
              />
            )}
            {desktopUrl !== undefined && (
              <Action.Open
                title="Open in Hermes Desktop"
                icon={Icon.Desktop}
                target={desktopUrl}
                shortcut={SHORTCUTS.openInDesktop}
              />
            )}
          </ActionPanel.Section>

          <ActionPanel.Section>
            {!terminal && (
              <Action
                title="Stop"
                icon={Icon.Stop}
                style={Action.Style.Destructive}
                shortcut={SHORTCUTS.stop}
                onAction={() => void handleStop()}
              />
            )}
            {state.status === "running" && (
              // Armadilha 22: fora de `running` o servidor recusa a orientação com 409.
              <Action.Push
                title="Guide the Task"
                icon={Icon.Compass}
                shortcut={SHORTCUTS.steer}
                target={
                  <SteerForm
                    onSend={async (text) => {
                      await steerAndReport(runId, text);
                      dispatch({ type: "steered" });
                    }}
                  />
                }
              />
            )}
            <Action
              title={mode === "etapas" ? "See the Answer" : "See the Steps"}
              icon={mode === "etapas" ? Icon.Text : Icon.List}
              shortcut={SHORTCUTS.toggleSteps}
              onAction={() => setMode(mode === "etapas" ? "resposta" : "etapas")}
            />
            <Action title="Refresh" icon={Icon.ArrowClockwise} shortcut={SHORTCUTS.refresh} onAction={refresh} />
          </ActionPanel.Section>

          <ActionPanel.Section>
            {/* §6.4 "Depois": itens 3, 7 e 8 da tabela — esta tela é a mesma `Detail` de
                §2.1.3 por força da §2.4.2, então as ações pós-conclusão valem aqui igual. */}
            {canContinue && (
              <Action
                title="Continue This Conversation"
                icon={Icon.SpeechBubble}
                shortcut={SHORTCUTS.continueConversation}
                onAction={() => void continueConversation()}
              />
            )}
            <Action
              // §10.3: a frase canônica é `Nova conversa`. `Nova tarefa` era um segundo
              // nome para o mesmo `Ctrl+N` que `ask.tsx` já chamava de `Nova conversa`.
              title="New Conversation"
              icon={Icon.Plus}
              shortcut={SHORTCUTS.newConversation}
              onAction={() => void launchCommand({ name: "run-task", type: LaunchType.UserInitiated })}
            />
            {terminal && sessionId !== undefined && (
              <Action
                title="Branch the Conversation"
                icon={Icon.Repeat}
                shortcut={SHORTCUTS.branch}
                onAction={() => void branch()}
              />
            )}
            {sessionId !== undefined && (
              <Action.Push
                title="Rename the Conversation"
                icon={Icon.Pencil}
                shortcut={SHORTCUTS.rename}
                target={
                  <RenameSessionForm
                    session={{ id: sessionId, title: title ?? null }}
                    onRenamed={(updated) => setRenamedTitle(updated.title ?? undefined)}
                  />
                }
              />
            )}
            <Action
              title="See Tasks in Progress"
              icon={Icon.List}
              shortcut={SHORTCUTS.activeRuns}
              onAction={() => void launchCommand({ name: "active-runs", type: LaunchType.UserInitiated })}
            />
            {state.pendingSteer !== undefined && (
              <Action
                title="Send as a New Question"
                icon={Icon.Compass}
                onAction={() =>
                  void launchCommand({
                    name: "run-task",
                    type: LaunchType.UserInitiated,
                    arguments: { tarefa: state.pendingSteer ?? "" },
                  })
                }
              />
            )}
            {sessionId !== undefined && (
              // §8.4: o `hermes://` pode não estar registrado. O identificador é o plano B.
              <Action.CopyToClipboard title="Copy the Conversation ID" content={sessionId} />
            )}
          </ActionPanel.Section>

          <ActionPanel.Section>
            <Action
              title={showTechnical ? "Hide Technical Details" : "Show Technical Details"}
              icon={showTechnical ? Icon.EyeDisabled : Icon.Eye}
              shortcut={SHORTCUTS.showTechnical}
              onAction={() => setShowTechnical(!showTechnical)}
            />
            <Action
              title="Copy Technical Details"
              icon={Icon.Clipboard}
              shortcut={SHORTCUTS.copyTechnical}
              onAction={() => {
                void Clipboard.copy(technicalDetails(technicalContext)).then(() => showHUD("Technical details copied"));
              }}
            />
            <Action
              title="Open Settings"
              icon={Icon.Gear}
              shortcut={SHORTCUTS.preferences}
              onAction={openExtensionPreferences}
            />
            <OpenModelsAction />
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
}

/* ═════════════════════════════ Markdown da tela ═════════════════════════════ */

interface MarkdownInput {
  state: RunViewState;
  prompt: string;
  mode: ViewMode;
  thinking: boolean;
  terminal: boolean;
  showTechnical: boolean;
  technicalContext: TechnicalContext;
  attachStream: boolean;
}

function buildMarkdown(input: MarkdownInput): string {
  const { state, prompt, mode, thinking, terminal, showTechnical, technicalContext, attachStream } = input;
  const blocks: string[] = [`### ${shorten(prompt, 120)}`];

  /* Avisos: sempre no topo, sempre em bloco de citação, nunca apagando o que já foi lido. */
  if (!attachStream && !terminal) {
    blocks.push(
      "> Following this task in simple mode. The text that went by while Raycast was closed cannot be recovered, but the final result shows up here.",
    );
  }
  if (state.stopping) {
    blocks.push(
      "> Stop request sent. Hermes is shutting down safely — that can take a few seconds if it is in the middle of a tool.",
    );
  }
  if (state.status === "waiting_for_approval" && !terminal) {
    blocks.push("> 🔐 **Hermes needs your permission to carry on.**");
  }
  if (state.pendingApprovals > 1) {
    blocks.push(
      `> There are ${state.pendingApprovals} approval requests in this task. Your answer applies to the oldest of them.`,
    );
  }
  for (const notice of state.notices) blocks.push(`> ${notice}`);
  if (state.expired) blocks.push(RUN_EXPIRED_DETAIL);

  if (mode === "etapas") {
    // Etapas = uma linha por evento, em linguagem simples. Nunca JSON, nunca log cru
    // (UX-SPEC §6.3); o que é técnico mora atrás de "Mostrar detalhes técnicos".
    blocks.push(state.steps.length > 0 ? state.steps.map((step) => step.line).join("\n\n") : "_No steps yet._");
    if (terminal && state.text !== "") blocks.push("---", state.text);
  } else {
    if (state.currentTool !== undefined) blocks.push(`> 🔧 Using ${state.currentTool}…`);
    if (state.text !== "") blocks.push(state.text);
    else if (terminal && !state.expired && state.runError === undefined) {
      blocks.push("Hermes finished without writing an answer.");
    } else if (!terminal) blocks.push(thinking ? "_Hermes is thinking…_" : "_Preparando…_");
  }

  /* E21 / E22 — o erro entra ABAIXO do que o usuário já leu (UX-SPEC §5.3). */
  if (state.runError !== undefined) {
    blocks.push("---", `Hermes could not finish: ${state.runError}`);
  } else if (state.text.startsWith("⚠️ Provider authentication failed")) {
    blocks.push(
      "---",
      "The model you picked is not authenticated in Hermes. Open Hermes Desktop and set up the provider, or pick another model.",
    );
  }

  if (state.pendingSteer !== undefined) {
    blocks.push("> Your guidance arrived after Hermes had finished. Do you want to send it as the next question?");
  }

  if (showTechnical) blocks.push("---", technicalMarkdown(technicalContext));

  return blocks.join("\n\n");
}

/* ═════════════════════ Leitura do resultado, para as listas ═════════════════════ */

/**
 * Texto do resultado de uma execução, para `Copiar resultado`. Tenta o servidor primeiro e
 * cai no que foi gravado localmente — o Hermes descarta o estado terminal em 1 h (§8.7),
 * e depois disso a cópia local é a única que resta.
 */
export async function readRunOutput(runId: string): Promise<string | undefined> {
  try {
    const run = await getRun(runId);
    if (run.output !== undefined && run.output !== "") return run.output;
  } catch {
    // 404 ou Hermes fora do ar: seguimos para a cópia local, sem incomodar o usuário.
  }
  const stored = await loadRunResult(runId);
  return stored?.output;
}
