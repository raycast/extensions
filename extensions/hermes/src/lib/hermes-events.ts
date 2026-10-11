/**
 * hermes-events.ts — parser SSE incremental + vocabulário tipado dos dois streams do Hermes.
 *
 * Este módulo NUNCA faz `fetch`: recebe um `Response` já aberto. Isso o torna 100% testável
 * sem servidor e sem credenciais.
 *
 * Os dois streams do Hermes têm formatos DIFERENTES (DECISOES-VERIFICADAS.md D-03):
 *
 * | | `POST /api/sessions/{id}/chat/stream` | `GET /v1/runs/{id}/events` |
 * |---|---|---|
 * | tipo do evento | campo `event:` do SSE | campo `event` DENTRO do JSON |
 * | fim do stream  | evento `done` (sempre em `finally`) | comentário `: stream closed` |
 * | acentuação     | UTF-8 cru (`ensure_ascii=False`) | `\uXXXX` (`ensure_ascii=True`) |
 * | uso de tokens  | `input_tokens`/`output_tokens` | `input_tokens`/`output_tokens` |
 *
 * `data: [DONE]` só existe em `/v1/chat/completions`, que NÃO usamos (D-05). O predicado
 * `isDoneSentinel` existe para provar essa diferença nos testes e impedir que alguém copie
 * um parser da OpenAI e fique esperando um sentinela que nunca chega no stream de runs.
 *
 * Dependências: só `types.ts` e `errors.ts` — nunca `hermes-api.ts`.
 */

import { HermesProtocolError, isAbort, toHermesError } from "./errors";
import type * as T from "./types";

/* ────────────────────────────── Frames SSE ────────────────────────────── */

export interface SseFrame {
  /** Valor do último campo `event:`; `undefined` em frames sem nome. */
  event?: string;
  /** Linhas `data:` unidas por "\n". "" quando não havia `data`. */
  data: string;
  id?: string;
  retry?: number;
  /** Preenchido quando a linha era um comentário (`: texto`). `data` fica "". */
  comment?: string;
}

export interface SseParser {
  /** Aceita qualquer fatia de texto e devolve os frames que ficaram completos. */
  push(chunk: string): SseFrame[];
  /** Fecha o que sobrou no buffer quando o stream acaba sem `\n\n` final. */
  flush(): SseFrame[];
}

/**
 * Máquina de estados incremental do protocolo SSE.
 *
 * Trata: LF, CRLF, CR isolado, CRLF partido entre dois `push`, BOM inicial, campo sem ":",
 * espaço único opcional depois do ":", `data` multilinha, comentários e campos desconhecidos.
 */
export function createSseParser(): SseParser {
  let buffer = "";
  let dataLines: string[] = [];
  let eventName: string | undefined;
  let lastId: string | undefined;
  let retry: number | undefined;
  let sawField = false;
  let bomChecked = false;

  function reset(): void {
    dataLines = [];
    eventName = undefined;
    retry = undefined;
    sawField = false;
  }

  function dispatch(out: SseFrame[]): void {
    if (!sawField) return reset();
    if (dataLines.length === 0 && eventName === undefined) return reset();
    out.push({ event: eventName, data: dataLines.join("\n"), id: lastId, retry });
    reset();
  }

  function handleLine(line: string, out: SseFrame[]): void {
    if (line === "") return dispatch(out);

    if (line.startsWith(":")) {
      // Comentário: não encerra o evento em curso e não é um evento. Mas `: stream closed`
      // é o fim do stream de runs, então o frame precisa chegar ao consumidor.
      out.push({ data: "", comment: line.slice(1).trim() });
      return;
    }

    const colon = line.indexOf(":");
    let field: string;
    let value: string;
    if (colon === -1) {
      field = line;
      value = "";
    } else {
      field = line.slice(0, colon);
      value = line.slice(colon + 1);
      if (value.startsWith(" ")) value = value.slice(1);
    }

    sawField = true;
    switch (field) {
      case "event":
        eventName = value;
        break;
      case "data":
        dataLines.push(value);
        break;
      case "id":
        if (!value.includes("\0")) lastId = value;
        break;
      case "retry": {
        const parsed = Number(value);
        if (Number.isInteger(parsed) && parsed >= 0) retry = parsed;
        break;
      }
      default:
        break; // campo desconhecido: ignorar, conforme a especificação
    }
  }

  return {
    push(chunk: string): SseFrame[] {
      const out: SseFrame[] = [];
      let text = chunk;

      // O BOM só pode aparecer no começo do corpo. Chunks vazios (comuns ao alimentar byte a
      // byte, porque o TextDecoder segura sequências multibyte) não podem consumir essa chance.
      if (!bomChecked && text !== "") {
        bomChecked = true;
        if (text.charCodeAt(0) === 0xfeff) text = text.slice(1);
      }
      buffer += text;

      let index = 0;
      let start = 0;
      while (index < buffer.length) {
        const ch = buffer[index];
        if (ch === "\n") {
          handleLine(buffer.slice(start, index), out);
          index += 1;
          start = index;
        } else if (ch === "\r") {
          // CR no fim do buffer: pode ser um CRLF partido entre chunks. Espera o próximo push.
          if (index === buffer.length - 1) break;
          handleLine(buffer.slice(start, index), out);
          index += buffer[index + 1] === "\n" ? 2 : 1;
          start = index;
        } else {
          index += 1;
        }
      }
      buffer = buffer.slice(start);
      return out;
    },

    flush(): SseFrame[] {
      const out: SseFrame[] = [];
      const rest = buffer.endsWith("\r") ? buffer.slice(0, -1) : buffer;
      buffer = "";
      if (rest !== "") handleLine(rest, out);
      dispatch(out);
      return out;
    },
  };
}

/**
 * Lê um `Response` SSE como um `AsyncGenerator` de frames.
 *
 * Cancelamento: quando `signal` aborta, o reader é cancelado e o gerador termina. O `finally`
 * cancela e libera o reader mesmo quando o consumidor sai por `break` ou por exceção — é isso
 * que fecha o socket quando uma view do Raycast é desmontada.
 */
export async function* readSseFrames(
  response: Response,
  signal?: AbortSignal,
): AsyncGenerator<SseFrame, void, undefined> {
  const body = response.body;
  if (!body) {
    throw new HermesProtocolError({
      userMessage: "Hermes answered in a way the extension did not understand.",
      technical: "readSseFrames: the SSE response arrived with no body (response.body is null).",
      recovery: "report_bug",
      uxId: "E24",
    });
  }

  const reader = body.getReader();
  const decoder = new TextDecoder("utf-8");
  const parser = createSseParser();
  const onAbort = (): void => {
    void reader.cancel().catch(() => undefined);
  };

  if (signal) {
    if (signal.aborted) onAbort();
    else signal.addEventListener("abort", onAbort, { once: true });
  }

  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      // `{ stream: true }` é obrigatório: sem ele um caractere multibyte partido entre dois
      // chunks TCP vira "�".
      for (const frame of parser.push(decoder.decode(value, { stream: true }))) yield frame;
    }
    for (const frame of parser.push(decoder.decode())) yield frame;
    for (const frame of parser.flush()) yield frame;
  } finally {
    signal?.removeEventListener("abort", onAbort);
    try {
      await reader.cancel();
    } catch {
      // stream já encerrado: nada a fazer
    }
    try {
      reader.releaseLock();
    } catch {
      // lock já liberado: nada a fazer
    }
  }
}

/** `: stream closed` é o comentário com que o servidor encerra o stream de runs. */
export function isStreamClosedComment(frame: SseFrame): boolean {
  return frame.comment === "stream closed";
}

/** `: keepalive` (a cada 30 s) e `: ping` são batimentos: ignorar sem encerrar nada. */
export function isKeepAliveComment(frame: SseFrame): boolean {
  return frame.comment === "keepalive" || frame.comment === "ping";
}

/** `data: [DONE]` — sentinela do formato OpenAI. NÃO existe em nenhum stream que usamos (D-03). */
export function isDoneSentinel(frame: SseFrame): boolean {
  return frame.comment === undefined && frame.data.trim() === "[DONE]";
}

/** Objeto JSON do frame, ou `undefined` se não houver `data` ou o JSON estiver corrompido. */
function parseFrameJson(frame: SseFrame): Record<string, unknown> | undefined {
  if (frame.data === "") return undefined;
  try {
    const value: unknown = JSON.parse(frame.data);
    return value !== null && typeof value === "object" ? (value as Record<string, unknown>) : undefined;
  } catch {
    return undefined; // frame corrompido: descartar, nunca derrubar o stream inteiro
  }
}

/** Visão sem tipo do payload, para ler campos opcionais sem espalhar casts pelo switch. */
function fields(event: object): Record<string, unknown> {
  return event as Record<string, unknown>;
}

function readString(value: unknown): string | undefined {
  return typeof value === "string" ? value : undefined;
}

function readNumber(value: unknown): number | undefined {
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

/* ─────────────────────── Normalização do uso de tokens ─────────────────────── */

/**
 * Os dois nomes coexistem no Hermes: `/v1/runs` usa `input_tokens`/`output_tokens` e o formato
 * OpenAI usa `prompt_tokens`/`completion_tokens`. A extensão trabalha com um formato só.
 */
export function normalizeUsage(raw: unknown): T.HermesUsage | undefined {
  if (raw === null || typeof raw !== "object") return undefined;
  const u = raw as Record<string, unknown>;

  const input = readNumber(u.input_tokens) ?? readNumber(u.prompt_tokens);
  const output = readNumber(u.output_tokens) ?? readNumber(u.completion_tokens);
  const total = readNumber(u.total_tokens);
  if (input === undefined && output === undefined && total === undefined) return undefined;

  return {
    input_tokens: input ?? 0,
    output_tokens: output ?? 0,
    total_tokens: total ?? (input ?? 0) + (output ?? 0),
  };
}

/* ───────── Vocabulário: POST /api/sessions/{id}/chat/stream (eventos nomeados) ───────── */

/**
 * Discriminador = NOME do evento SSE, copiado para o campo `type`.
 * A lista dos 11 nomes válidos vive em `types.ts` (`SessionChatEventName`), derivada da união.
 */
export function parseSessionChatEvent(frame: SseFrame): T.SessionChatEvent | undefined {
  if (frame.comment !== undefined || !frame.event) return undefined;
  const payload = parseFrameJson(frame);
  if (!payload) return undefined;
  return { ...payload, type: frame.event } as unknown as T.SessionChatEvent;
}

/* ───────── Vocabulário: GET /v1/runs/{id}/events (sem campo `event:` no SSE) ───────── */

export type RunTerminalEvent = "run.completed" | "run.failed" | "run.cancelled";

export const RUN_TERMINAL_EVENTS: ReadonlySet<string> = new Set<string>([
  "run.completed",
  "run.failed",
  "run.cancelled",
]);

/** Discriminador = campo `event` DENTRO do JSON. Ler `frame.event` aqui devolve sempre vazio. */
export function parseRunEvent(frame: SseFrame): T.RunEvent | undefined {
  if (frame.comment !== undefined) return undefined;
  const payload = parseFrameJson(frame);
  if (!payload || typeof payload.event !== "string") return undefined;
  return payload as unknown as T.RunEvent;
}

/* ─────────────────── Consumidor: stream de conversa da sessão ─────────────────── */

export interface SessionChatHandlers {
  /** Recebe todo evento já tipado, inclusive nomes futuros desconhecidos. */
  onEvent?: (event: T.SessionChatEvent) => void;
  /** Texto incremental já acumulado. */
  onText?: (fullText: string) => void;
  onToolStarted?: (toolName: string, preview: string | null) => void;
  onToolCompleted?: (toolName: string) => void;
  /** Prévia de raciocínio (`tool.progress`). */
  onThinking?: (text: string) => void;
  onError?: (message: string) => void;
}

export interface SessionChatResult {
  /** Id EFETIVO ao fim do turno — pode diferir do inicial se houve compressão. Persistir ESTE. */
  sessionId: string;
  runId?: string;
  messageId?: string;
  /** Texto final autoritativo (de `assistant.completed`), com recuo para os deltas. */
  content: string;
  usage?: T.HermesUsage;
  runtime?: T.RuntimeMetadata;
  /** Transcrição do turno (de `run.completed`). Fonte da verdade para renderizar tool calls. */
  messages: T.SessionMessage[];
  interrupted: boolean;
  completed: boolean;
  /** Preenchido quando veio um evento `error` (o HTTP já era 200). */
  errorMessage?: string;
  pendingSteer?: string;
  /** true quando o servidor emitiu o evento `done`. */
  closedByServer: boolean;
  /** true quando o consumidor abortou. Neste endpoint abortar INTERROMPE o turno no servidor. */
  aborted: boolean;
}

export async function consumeSessionChatStream(
  response: Response,
  initialSessionId: string,
  handlers: SessionChatHandlers = {},
  signal?: AbortSignal,
): Promise<SessionChatResult> {
  const result: SessionChatResult = {
    sessionId: initialSessionId,
    content: "",
    messages: [],
    interrupted: false,
    completed: false,
    closedByServer: false,
    aborted: false,
  };
  let deltaText = "";

  try {
    for await (const frame of readSseFrames(response, signal)) {
      if (frame.comment !== undefined) continue; // `: keepalive` e afins
      const event = parseSessionChatEvent(frame);
      if (!event) continue;
      handlers.onEvent?.(event);

      const f = fields(event);
      switch (event.type) {
        case "run.started":
          result.runId = readString(f.run_id) ?? result.runId;
          break;

        case "message.started": {
          const message = f.message;
          if (message !== null && typeof message === "object") {
            result.messageId = readString((message as Record<string, unknown>).id) ?? result.messageId;
          }
          break;
        }

        case "assistant.delta": {
          const delta = readString(f.delta) ?? "";
          if (delta !== "") {
            deltaText += delta;
            handlers.onText?.(deltaText);
          }
          break;
        }

        case "tool.progress":
          handlers.onThinking?.(readString(f.delta) ?? "");
          break;

        case "tool.started":
          handlers.onToolStarted?.(readString(f.tool_name) ?? "", readString(f.preview) ?? null);
          break;

        case "tool.completed":
        case "tool.failed":
          handlers.onToolCompleted?.(readString(f.tool_name) ?? "");
          break;

        case "assistant.completed":
          // O `session_id` daqui é o EFETIVO: seguir sempre este.
          result.sessionId = readString(f.session_id) ?? result.sessionId;
          result.messageId = readString(f.message_id) ?? result.messageId;
          result.content = readString(f.content) ?? deltaText;
          result.interrupted = f.interrupted === true;
          if (f.runtime !== undefined) result.runtime = f.runtime as T.RuntimeMetadata;
          handlers.onText?.(result.content);
          break;

        case "run.completed":
          result.sessionId = readString(f.session_id) ?? result.sessionId;
          result.messages = Array.isArray(f.messages) ? (f.messages as T.SessionMessage[]) : [];
          result.usage = normalizeUsage(f.usage) ?? result.usage;
          if (f.runtime !== undefined) result.runtime = f.runtime as T.RuntimeMetadata;
          result.pendingSteer = readString(f.pending_steer);
          result.completed = true;
          break;

        case "error": {
          const message = readString(f.message) ?? "Erro desconhecido.";
          result.errorMessage = message;
          handlers.onError?.(message);
          break;
        }

        case "done":
          // `done` é sempre o último evento deste stream (o servidor o emite num `finally`).
          result.closedByServer = true;
          break;

        default:
          break; // evento futuro desconhecido: ignorar sem quebrar
      }

      if (result.closedByServer) break;
    }
  } catch (err) {
    // Abortar é rotina (desmontagem da view ou "Parar"). Qualquer outra falha — conexão caída
    // no meio do streaming (E23) — precisa subir: o texto parcial já foi entregue por `onText`.
    if (signal?.aborted || isAbort(err)) result.aborted = true;
    else throw toHermesError(err, "consumeSessionChatStream");
  }

  if (signal?.aborted) result.aborted = true;
  if (result.aborted) result.interrupted = true;
  if (result.content === "") result.content = deltaText;
  return result;
}

/* ───────────────────── Consumidor: stream de eventos da run ───────────────────── */

export interface RunStreamHandlers {
  onEvent?: (event: T.RunEvent) => void;
  onText?: (fullText: string) => void;
  onToolStarted?: (tool: string, preview: string | null) => void;
  onToolCompleted?: (tool: string, durationSeconds: number, failed: boolean) => void;
  onReasoning?: (text: string) => void;
  onSubagent?: (event: T.RunEvent) => void;
  /** OBRIGATÓRIO persistir imediatamente: não há como reobter uma aprovação perdida. */
  onApprovalRequest?: (request: T.ApprovalRequestFields & { run_id: string; timestamp: number }) => void;
  onApprovalResponded?: (choice: T.ApprovalChoice, resolved: number) => void;
}

export interface RunStreamResult {
  runId: string;
  /** Acúmulo dos `message.delta` — único carregador de texto do assistente neste stream. */
  text: string;
  output?: string;
  usage?: T.HermesUsage;
  error?: string;
  pendingSteer?: string;
  /** Último evento terminal observado, se houve. */
  terminalEvent?: RunTerminalEvent;
  /** true quando o servidor escreveu `: stream closed`. */
  closedByServer: boolean;
  /** true quando o consumidor abortou. A RUN CONTINUA no servidor (D-02). */
  aborted: boolean;
}

export async function consumeRunEventStream(
  response: Response,
  runId: string,
  handlers: RunStreamHandlers = {},
  signal?: AbortSignal,
): Promise<RunStreamResult> {
  const result: RunStreamResult = { runId, text: "", closedByServer: false, aborted: false };

  try {
    for await (const frame of readSseFrames(response, signal)) {
      if (frame.comment !== undefined) {
        if (isStreamClosedComment(frame)) {
          // Fim do stream de runs (D-03). Não existe `[DONE]` aqui: esperar por ele pendura a tela.
          result.closedByServer = true;
          break;
        }
        continue; // `: keepalive`, `: ping` e qualquer outro comentário
      }

      const event = parseRunEvent(frame);
      if (!event) continue;
      handlers.onEvent?.(event);

      const f = fields(event);
      if (RUN_TERMINAL_EVENTS.has(event.event)) result.terminalEvent = event.event as RunTerminalEvent;

      switch (event.event) {
        case "message.delta": {
          const delta = readString(f.delta) ?? "";
          if (delta !== "") {
            result.text += delta;
            handlers.onText?.(result.text);
          }
          break;
        }

        case "tool.started":
          handlers.onToolStarted?.(readString(f.tool) ?? "", readString(f.preview) ?? null);
          break;

        case "tool.completed":
          // Falha de ferramenta chega como este evento com `error: true`. Não existe `tool.failed`.
          handlers.onToolCompleted?.(readString(f.tool) ?? "", readNumber(f.duration) ?? 0, f.error === true);
          break;

        case "reasoning.available":
          handlers.onReasoning?.(readString(f.text) ?? "");
          break;

        case "subagent.start":
        case "subagent.complete":
          handlers.onSubagent?.(event);
          break;

        case "approval.request":
          handlers.onApprovalRequest?.(
            event as unknown as T.ApprovalRequestFields & { run_id: string; timestamp: number },
          );
          break;

        case "approval.responded":
          handlers.onApprovalResponded?.(
            (readString(f.choice) ?? "once") as T.ApprovalChoice,
            readNumber(f.resolved) ?? 0,
          );
          break;

        case "run.completed":
          result.output = readString(f.output);
          result.usage = normalizeUsage(f.usage) ?? result.usage;
          result.pendingSteer = readString(f.pending_steer);
          break;

        case "run.failed":
          result.error = readString(f.error);
          break;

        case "run.cancelled":
          break; // sem carga: `terminalEvent` acima já registrou o desfecho

        default:
          break; // `run.steered` e eventos futuros: chegam por `onEvent`, sem tratamento próprio
      }
    }
  } catch (err) {
    // Abortar aqui NÃO cancela a run no servidor (D-02): só deixamos de ver os eventos.
    if (signal?.aborted || isAbort(err)) result.aborted = true;
    else throw toHermesError(err, "consumeRunEventStream");
  }

  if (signal?.aborted) result.aborted = true;
  return result;
}

/* ──────────── Buffer de renderização (UX-SPEC §6.2, ARCHITECTURE §8.7) ──────────── */

export interface TextBuffer {
  /** Registra o texto acumulado mais recente e agenda um único flush. */
  push(text: string): void;
  /** Publica na hora e cancela o flush pendente. Obrigatório ao fim do stream. */
  flush(): void;
  /** Cancela o flush pendente SEM publicar. Use na desmontagem, junto do abort. */
  cancel(): void;
}

/**
 * Agrupa os `onText` do stream para que a view chame `setState` ~12 vezes por segundo em
 * vez de uma por token: cada re-render do `Detail` atravessa a ponte IPC até o host WPF do
 * Raycast, e sem isto uma resposta longa engasga a interface (armadilha 55).
 *
 * `push()` guarda o texto MAIS RECENTE — os dois consumidores deste módulo entregam o
 * acumulado, não o delta — e agenda um flush; chamadas dentro da janela não agendam nada.
 * `cancel()` existe para a desmontagem: publicar depois do unmount é `setState` em
 * componente morto, que o Raycast mostra como erro em tela cheia no `ray develop`.
 */
export function createTextBuffer(onFlush: (text: string) => void, intervalMs = 80): TextBuffer {
  let latest = "";
  let timer: ReturnType<typeof setTimeout> | undefined;

  const clear = (): void => {
    if (timer !== undefined) {
      clearTimeout(timer);
      timer = undefined;
    }
  };

  return {
    push(text: string): void {
      latest = text;
      if (timer !== undefined) return;
      timer = setTimeout(() => {
        timer = undefined;
        onFlush(latest);
      }, intervalMs);
    },
    flush(): void {
      clear();
      onFlush(latest);
    },
    cancel(): void {
      clear();
    },
  };
}
