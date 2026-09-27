/**
 * Testes do parser SSE — o módulo de maior risco do projeto.
 *
 * A regra central: alimentar as capturas LITERAIS do servidor real
 * (docs/research/fixtures/CAPTURAS-AO-VIVO.md) um byte por vez tem que produzir exatamente a
 * mesma sequência de frames que alimentá-las de uma vez só. É esse teste que pega bug de
 * fronteira de chunk, que em produção aparece como texto truncado ou "�" no meio de palavra.
 *
 * Executar: `node --test`
 */

import test from "node:test";
import assert from "node:assert/strict";

// Os hooks precisam estar registrados ANTES de `hermes-events.ts` ser resolvido, porque ele
// importa "./errors" sem extensão (convenção do tsconfig commonjs). Por isso o módulo sob teste
// entra por `await import`, e não por import estático — que seria içado e resolvido cedo demais.
import "./helpers/module-hooks.mjs";
import { HermesConnectionError, HermesError, HermesProtocolError } from "../src/lib/errors.ts";
import type { SseFrame } from "../src/lib/hermes-events.ts";

const {
  consumeRunEventStream,
  consumeSessionChatStream,
  createSseParser,
  createTextBuffer,
  isDoneSentinel,
  isKeepAliveComment,
  isStreamClosedComment,
  normalizeUsage,
  parseRunEvent,
  parseSessionChatEvent,
  readSseFrames,
} = await import("../src/lib/hermes-events.ts");

/* ══════════════════════════════ Fixtures literais ══════════════════════════════ */

/** CAPTURAS-AO-VIVO.md §1 — `POST /v1/chat/completions` com `stream: true`. */
const CHAT_COMPLETIONS_STREAM = [
  `data: {"id": "chatcmpl-4a0ad1a62b144dec8da08a410861a", "object": "chat.completion.chunk", "created": 1787170384, "model": "hermes-agent", "choices": [{"index": 0, "delta": {"role": "assistant"}, "finish_reason": null}]}`,
  ``,
  `data: {"id": "chatcmpl-4a0ad1a62b144dec8da08a410861a", "object": "chat.completion.chunk", "created": 1787170384, "model": "hermes-agent", "choices": [{"index": 0, "delta": {"content": "ok"}, "finish_reason": null}]}`,
  ``,
  `data: {"id": "chatcmpl-4a0ad1a62b144dec8da08a410861a", "object": "chat.completion.chunk", "created": 1787170384, "model": "hermes-agent", "choices": [{"index": 0, "delta": {}, "finish_reason": "stop"}], "usage": {"prompt_tokens": 19997, "completion_tokens": 5, "total_tokens": 20002}}`,
  ``,
  `data: [DONE]`,
  ``,
  ``, // o fio termina o último frame com "\n\n", como todo frame SSE
].join("\n");

/** CAPTURAS-AO-VIVO.md §2 — `GET /v1/runs/{id}/events`. Termina em `: stream closed`. */
const RUN_EVENTS_STREAM = [
  `data: {"event": "message.delta", "run_id": "run_aa83c6e0509242aab080cd2e282de3b5", "timestamp": 1787170400.501083, "delta": "pr"}`,
  ``,
  `data: {"event": "message.delta", "run_id": "run_aa83c6e0509242aab080cd2e282de3b5", "timestamp": 1787170400.5569196, "delta": "onto"}`,
  ``,
  `data: {"event": "reasoning.available", "run_id": "run_aa83c6e0509242aab080cd2e282de3b5", "timestamp": 1787170400.948054, "text": "pronto"}`,
  ``,
  `data: {"event": "run.completed", "run_id": "run_aa83c6e0509242aab080cd2e282de3b5", "timestamp": 1787170400.9905906, "output": "pronto", "usage": {"input_tokens": 19996, "output_tokens": 6, "total_tokens": 20002}}`,
  ``,
  `: stream closed`,
  ``,
].join("\n");

/** research/03 §B.10 — `POST /api/sessions/{id}/chat/stream`, eventos nomeados + `: keepalive`. */
const SESSION_CHAT_STREAM = [
  `event: run.started`,
  `data: {"user_message": {"role": "user", "content": "list files"}, "runtime": {"provider": "", "model": "", "route_source": "global"}, "session_id": "raycast-abc", "run_id": "run_2f0c", "seq": 1, "ts": 1755631234.11}`,
  ``,
  `event: message.started`,
  `data: {"message": {"id": "msg_9a7b", "role": "assistant"}, "session_id": "raycast-abc", "run_id": "run_2f0c", "seq": 2, "ts": 1755631234.12}`,
  ``,
  `event: tool.started`,
  `data: {"message_id": "msg_9a7b", "tool_name": "terminal", "preview": "terminal(ls -la)", "args": {"command": "ls -la"}, "session_id": "raycast-abc", "run_id": "run_2f0c", "seq": 3, "ts": 1755631234.30}`,
  ``,
  `event: tool.completed`,
  `data: {"message_id": "msg_9a7b", "tool_name": "terminal", "preview": null, "args": null, "session_id": "raycast-abc", "run_id": "run_2f0c", "seq": 4, "ts": 1755631235.02}`,
  ``,
  `event: assistant.delta`,
  `data: {"message_id": "msg_9a7b", "delta": "Here are ", "session_id": "raycast-abc", "run_id": "run_2f0c", "seq": 5, "ts": 1755631235.20}`,
  ``,
  `event: assistant.delta`,
  `data: {"message_id": "msg_9a7b", "delta": "the files.", "session_id": "raycast-abc", "run_id": "run_2f0c", "seq": 6, "ts": 1755631235.24}`,
  ``,
  `: keepalive`,
  ``,
  `event: assistant.completed`,
  `data: {"session_id": "raycast-xyz", "message_id": "msg_9a7b", "content": "Here are the files.", "completed": true, "partial": false, "interrupted": false, "runtime": {"provider": "anthropic", "model": "anthropic/claude-opus-4.6", "route_source": "global"}, "run_id": "run_2f0c", "seq": 7, "ts": 1755631235.30}`,
  ``,
  `event: run.completed`,
  `data: {"session_id": "raycast-xyz", "message_id": "msg_9a7b", "completed": true, "messages": [{"id": 4214, "session_id": "raycast-xyz", "role": "assistant", "content": "", "tool_calls": [{"id": "call_1", "type": "function", "function": {"name": "terminal", "arguments": "{\\"command\\": \\"ls -la\\"}"}}], "timestamp": 1755631235.0}, {"id": 4215, "session_id": "raycast-xyz", "role": "tool", "content": "total 12", "tool_call_id": "call_1", "tool_name": "terminal", "timestamp": 1755631235.0}], "usage": {"input_tokens": 812, "output_tokens": 96, "total_tokens": 908}, "runtime": {"provider": "anthropic", "model": "anthropic/claude-opus-4.6", "route_source": "global"}, "run_id": "run_2f0c", "seq": 8, "ts": 1755631235.31}`,
  ``,
  `event: done`,
  `data: {"session_id": "raycast-xyz", "run_id": "run_2f0c", "seq": 9, "ts": 1755631235.32}`,
  ``,
  ``, // o fio termina o último frame com "\n\n", como todo frame SSE
].join("\n");

/* ══════════════════════════════ Utilitários ══════════════════════════════ */

const encoder = new TextEncoder();

interface StreamProbe {
  response: Response;
  /** true depois que o ReadableStream de origem foi cancelado (prova de que o socket fecharia). */
  wasCancelled: () => boolean;
}

function sliceBytes(bytes: Uint8Array, size: number): Uint8Array[] {
  if (!Number.isFinite(size)) return [bytes];
  const out: Uint8Array[] = [];
  for (let i = 0; i < bytes.length; i += size) out.push(bytes.subarray(i, i + size));
  return out;
}

/** Monta um Response SSE falso. `keepOpen` deixa o stream sem EOF, como um socket vivo. */
function makeResponse(text: string, chunkSize: number, keepOpen = false): StreamProbe {
  const chunks = sliceBytes(encoder.encode(text), chunkSize);
  let cancelled = false;
  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      for (const chunk of chunks) controller.enqueue(chunk);
      if (!keepOpen) controller.close();
    },
    cancel() {
      cancelled = true;
    },
  });
  return { response: new Response(stream), wasCancelled: () => cancelled };
}

async function collectFrames(text: string, chunkSize: number): Promise<SseFrame[]> {
  const probe = makeResponse(text, chunkSize);
  const frames: SseFrame[] = [];
  for await (const frame of readSseFrames(probe.response)) frames.push(frame);
  return frames;
}

/** Descarta as chaves `undefined` para comparações legíveis com literais. */
function shape(frames: SseFrame[]): Array<Record<string, unknown>> {
  return frames.map((frame) => {
    const out: Record<string, unknown> = { data: frame.data };
    if (frame.event !== undefined) out.event = frame.event;
    if (frame.comment !== undefined) out.comment = frame.comment;
    if (frame.id !== undefined) out.id = frame.id;
    if (frame.retry !== undefined) out.retry = frame.retry;
    return out;
  });
}

/** Alimenta o parser em fatias de `size` CARACTERES (sem passar pelo TextDecoder). */
function parseInSlices(text: string, size: number): SseFrame[] {
  const parser = createSseParser();
  const frames: SseFrame[] = [];
  for (let i = 0; i < text.length; i += size) frames.push(...parser.push(text.slice(i, i + size)));
  frames.push(...parser.flush());
  return frames;
}

/* ═══════════════ 1. Invariância à fronteira de chunk (o teste central) ═══════════════ */

test("stream de runs: 1 byte por vez produz a MESMA sequência que um chunk único", async () => {
  const single = await collectFrames(RUN_EVENTS_STREAM, Infinity);
  const byteByByte = await collectFrames(RUN_EVENTS_STREAM, 1);
  const byThree = await collectFrames(RUN_EVENTS_STREAM, 3);
  const bySeventeen = await collectFrames(RUN_EVENTS_STREAM, 17);

  assert.deepEqual(byteByByte, single);
  assert.deepEqual(byThree, single);
  assert.deepEqual(bySeventeen, single);

  // E a sequência é exatamente a esperada: 4 frames de dados + o comentário terminal.
  assert.equal(single.length, 5);
  assert.equal(single[0].event, undefined, "o stream de runs NÃO usa o campo `event:` do SSE");
  assert.equal(JSON.parse(single[0].data).event, "message.delta");
  assert.equal(JSON.parse(single[1].data).delta, "onto");
  assert.equal(JSON.parse(single[2].data).event, "reasoning.available");
  assert.equal(JSON.parse(single[3].data).event, "run.completed");
  assert.deepEqual(shape([single[4]]), [{ data: "", comment: "stream closed" }]);
});

test("stream de chat-completions: 1 byte por vez produz a MESMA sequência que um chunk único", async () => {
  const single = await collectFrames(CHAT_COMPLETIONS_STREAM, Infinity);
  const byteByByte = await collectFrames(CHAT_COMPLETIONS_STREAM, 1);
  const byFive = await collectFrames(CHAT_COMPLETIONS_STREAM, 5);

  assert.deepEqual(byteByByte, single);
  assert.deepEqual(byFive, single);

  assert.equal(single.length, 4);
  assert.equal(JSON.parse(single[0].data).object, "chat.completion.chunk");
  assert.equal(single[3].data, "[DONE]");
});

test("stream de conversa da sessão: 1 byte por vez produz a MESMA sequência que um chunk único", async () => {
  const single = await collectFrames(SESSION_CHAT_STREAM, Infinity);
  const byteByByte = await collectFrames(SESSION_CHAT_STREAM, 1);
  const byNine = await collectFrames(SESSION_CHAT_STREAM, 9);

  assert.deepEqual(byteByByte, single);
  assert.deepEqual(byNine, single);

  const names = single.filter((f) => f.comment === undefined).map((f) => f.event);
  assert.deepEqual(names, [
    "run.started",
    "message.started",
    "tool.started",
    "tool.completed",
    "assistant.delta",
    "assistant.delta",
    "assistant.completed",
    "run.completed",
    "done",
  ]);
  assert.equal(single.filter((f) => f.comment !== undefined).length, 1);
});

test("CRLF produz os mesmos frames que LF, inclusive byte a byte", async () => {
  const crlf = RUN_EVENTS_STREAM.replace(/\n/g, "\r\n");
  const lfFrames = await collectFrames(RUN_EVENTS_STREAM, Infinity);
  const crlfSingle = await collectFrames(crlf, Infinity);
  const crlfByByte = await collectFrames(crlf, 1);

  assert.deepEqual(crlfSingle, lfFrames);
  assert.deepEqual(crlfByByte, lfFrames);
});

/* ═══════════════ 2. Fronteiras patológicas de linha ═══════════════ */

test("frame partido EXATAMENTE entre \\r e \\n é interpretado como um único terminador", () => {
  const parser = createSseParser();

  // O chunk termina no CR: o parser não pode fechar a linha ainda, senão o LF seguinte
  // viraria uma segunda linha em branco e despacharia um frame fantasma.
  const first = parser.push('data: {"a": 1}\r');
  assert.deepEqual(first, [], "nada pode ser emitido enquanto o CR pode ser metade de um CRLF");

  const second = parser.push('\n\r\ndata: {"b": 2}\r\n\r\n');
  assert.deepEqual(shape(second), [{ data: '{"a": 1}' }, { data: '{"b": 2}' }]);
  assert.deepEqual(parser.flush(), []);
});

test("CR isolado (sem LF) também termina a linha", () => {
  const frames = parseInSlices("data: um\rdata: dois\r\r", 100);
  assert.deepEqual(shape(frames), [{ data: "um\ndois" }]);
});

test("BOM inicial é descartado sem engolir o primeiro campo", () => {
  const text = "﻿data: com-bom\n\n";
  assert.deepEqual(shape(parseInSlices(text, 1000)), [{ data: "com-bom" }]);
  assert.deepEqual(shape(parseInSlices(text, 1)), [{ data: "com-bom" }]);
});

test("BOM que chega em chunk separado dos dados ainda é descartado", () => {
  const parser = createSseParser();
  assert.deepEqual(parser.push(""), []);
  assert.deepEqual(parser.push("﻿"), []);
  const frames = parser.push("data: ok\n\n");
  assert.deepEqual(shape(frames), [{ data: "ok" }]);
});

/* ═══════════════ 3. Regras de campo do protocolo ═══════════════ */

test("data sem espaço, data multilinha, campo sem ':' e campo desconhecido", () => {
  const text = [
    "data:sem-espaco",
    "data: linha1",
    "data: linha2",
    "id: 7",
    "retry: 250",
    "coisa: ignorada",
    "sozinho",
    "",
  ].join("\n");
  const frames = parseInSlices(text + "\n", 1000);
  assert.deepEqual(shape(frames), [{ data: "sem-espaco\nlinha1\nlinha2", id: "7", retry: 250 }]);
});

test("bloco sem nenhum campo não emite frame", () => {
  assert.deepEqual(parseInSlices("\n\n\n\n", 1000), []);
});

test("flush() fecha um frame final que veio sem a linha em branco", () => {
  const parser = createSseParser();
  assert.deepEqual(parser.push('data: {"x": 1}'), []);
  assert.deepEqual(shape(parser.flush()), [{ data: '{"x": 1}' }]);
});

test("flush() ignora um CR pendurado no fim do buffer", () => {
  const parser = createSseParser();
  parser.push("data: fim\r");
  assert.deepEqual(shape(parser.flush()), [{ data: "fim" }]);
});

/* ═══════════════ 4. Comentários: heartbeat vs. sinal de término ═══════════════ */

test("comentários não geram evento e não encerram o evento em curso", () => {
  const text = [": keepalive", ":ping", "data: parte1", ": keepalive", "data: parte2", "", ": stream closed", ""].join(
    "\n",
  );
  const frames = parseInSlices(text, 1000);

  assert.deepEqual(shape(frames), [
    { data: "", comment: "keepalive" },
    { data: "", comment: "ping" },
    { data: "", comment: "keepalive" },
    { data: "parte1\nparte2" },
    { data: "", comment: "stream closed" },
  ]);

  // Nenhum comentário vira evento tipado em nenhum dos dois vocabulários.
  for (const frame of frames.filter((f) => f.comment !== undefined)) {
    assert.equal(parseRunEvent(frame), undefined);
    assert.equal(parseSessionChatEvent(frame), undefined);
  }
});

test("predicados de comentário e do sentinela [DONE]", () => {
  assert.equal(isStreamClosedComment({ data: "", comment: "stream closed" }), true);
  assert.equal(isStreamClosedComment({ data: "", comment: "keepalive" }), false);
  assert.equal(isKeepAliveComment({ data: "", comment: "keepalive" }), true);
  assert.equal(isKeepAliveComment({ data: "", comment: "ping" }), true);
  assert.equal(isKeepAliveComment({ data: "", comment: "stream closed" }), false);
  assert.equal(isDoneSentinel({ data: "[DONE]" }), true);
  assert.equal(isDoneSentinel({ data: "", comment: "[DONE]" }), false);
  assert.equal(isDoneSentinel({ data: '{"event": "run.completed"}' }), false);
});

/* ═══════════════ 5. `data: [DONE]` termina o stream de chat-completions ═══════════════ */

test("`data: [DONE]` termina o stream de chat-completions mesmo sem EOF", { timeout: 5000 }, async () => {
  // keepOpen: o socket continua vivo. Só o sentinela pode encerrar a leitura.
  const probe = makeResponse(CHAT_COMPLETIONS_STREAM, Infinity, true);
  const payloads: string[] = [];
  let sawDone = false;

  for await (const frame of readSseFrames(probe.response)) {
    if (isDoneSentinel(frame)) {
      sawDone = true;
      break;
    }
    payloads.push(frame.data);
  }

  assert.equal(sawDone, true);
  assert.equal(payloads.length, 3, "os 3 chunks vieram antes do sentinela");
  assert.equal(probe.wasCancelled(), true, "sair do laço cancela a origem e fecharia o socket");
  assert.equal(probe.response.body?.locked, false, "o reader foi liberado");
});

test("o stream de runs NÃO tem [DONE] — quem espera por ele pendura a tela", async () => {
  const frames = await collectFrames(RUN_EVENTS_STREAM, 1);
  assert.equal(
    frames.some((frame) => isDoneSentinel(frame)),
    false,
  );
  assert.equal(
    frames.some((frame) => isStreamClosedComment(frame)),
    true,
  );
});

/* ═══════════════ 6. Normalização do uso de tokens ═══════════════ */

test("normalizeUsage funde os dois formatos num só", () => {
  assert.deepEqual(normalizeUsage({ input_tokens: 19996, output_tokens: 6, total_tokens: 20002 }), {
    input_tokens: 19996,
    output_tokens: 6,
    total_tokens: 20002,
  });
  assert.deepEqual(normalizeUsage({ prompt_tokens: 19997, completion_tokens: 5, total_tokens: 20002 }), {
    input_tokens: 19997,
    output_tokens: 5,
    total_tokens: 20002,
  });
  // Sem total: soma as partes.
  assert.deepEqual(normalizeUsage({ prompt_tokens: 10, completion_tokens: 4 }), {
    input_tokens: 10,
    output_tokens: 4,
    total_tokens: 14,
  });
  assert.equal(normalizeUsage(undefined), undefined);
  assert.equal(normalizeUsage(null), undefined);
  assert.equal(normalizeUsage({}), undefined);
  assert.equal(normalizeUsage({ input_tokens: "muitos" }), undefined);
});

/* ═══════════════ 7. Consumidor do stream de runs ═══════════════ */

test("consumeRunEventStream: captura literal, byte a byte, dá o mesmo resultado", async () => {
  const single = await consumeRunEventStream(makeResponse(RUN_EVENTS_STREAM, Infinity).response, "run_aa83");
  const byteByByte = await consumeRunEventStream(makeResponse(RUN_EVENTS_STREAM, 1).response, "run_aa83");

  assert.deepEqual(byteByByte, single);
  assert.equal(single.runId, "run_aa83");
  assert.equal(single.text, "pronto", "acúmulo de message.delta: 'pr' + 'onto'");
  assert.equal(single.output, "pronto");
  assert.deepEqual(single.usage, { input_tokens: 19996, output_tokens: 6, total_tokens: 20002 });
  assert.equal(single.terminalEvent, "run.completed");
  assert.equal(single.closedByServer, true, "o fim veio de ': stream closed', não de [DONE]");
  assert.equal(single.aborted, false);
  assert.equal(single.error, undefined);
  assert.equal(single.pendingSteer, undefined);
});

test("consumeRunEventStream: handlers recebem exatamente os eventos observados", async () => {
  const texts: string[] = [];
  const reasoning: string[] = [];
  const eventNames: string[] = [];

  await consumeRunEventStream(makeResponse(RUN_EVENTS_STREAM, 1).response, "run_aa83", {
    onEvent: (event) => eventNames.push(event.event),
    onText: (full) => texts.push(full),
    onReasoning: (text) => reasoning.push(text),
  });

  assert.deepEqual(eventNames, ["message.delta", "message.delta", "reasoning.available", "run.completed"]);
  assert.deepEqual(texts, ["pr", "pronto"]);
  assert.deepEqual(reasoning, ["pronto"]);
});

test("`: stream closed` termina o stream de runs mesmo sem EOF", { timeout: 5000 }, async () => {
  const probe = makeResponse(RUN_EVENTS_STREAM, Infinity, true);
  const result = await consumeRunEventStream(probe.response, "run_aa83");

  assert.equal(result.closedByServer, true);
  assert.equal(result.output, "pronto");
  assert.equal(probe.wasCancelled(), true, "o reader é liberado ao encerrar — nada vaza");
  assert.equal(probe.response.body?.locked, false);
});

test("keepalive e comentários desconhecidos não produzem evento algum", async () => {
  const stream = [": keepalive", "", ":ping", "", ": alguma coisa nova", "", ": stream closed", ""].join("\n");
  const events: unknown[] = [];
  const result = await consumeRunEventStream(makeResponse(stream, 1).response, "run_x", {
    onEvent: (event) => events.push(event),
  });

  assert.deepEqual(events, []);
  assert.equal(result.text, "");
  assert.equal(result.closedByServer, true);
  assert.equal(result.terminalEvent, undefined);
});

test("run.failed e tool.completed com error:true são propagados", async () => {
  const stream = [
    `data: {"event": "tool.started", "run_id": "run_9f4c", "timestamp": 1.0, "tool": "terminal", "preview": "ls -la"}`,
    ``,
    `data: {"event": "tool.completed", "run_id": "run_9f4c", "timestamp": 2.0, "tool": "terminal", "duration": 1.25, "error": true}`,
    ``,
    `data: {"event": "run.failed", "run_id": "run_9f4c", "timestamp": 3.0, "error": "o comando saiu com codigo 1"}`,
    ``,
    `: stream closed`,
    ``,
  ].join("\n");

  const started: Array<[string, string | null]> = [];
  const completed: Array<[string, number, boolean]> = [];
  const result = await consumeRunEventStream(makeResponse(stream, 1).response, "run_9f4c", {
    onToolStarted: (tool, preview) => started.push([tool, preview]),
    onToolCompleted: (tool, duration, failed) => completed.push([tool, duration, failed]),
  });

  assert.deepEqual(started, [["terminal", "ls -la"]]);
  assert.deepEqual(completed, [["terminal", 1.25, true]]);
  assert.equal(result.terminalEvent, "run.failed");
  assert.equal(result.error, "o comando saiu com codigo 1");
});

test("stream de runs vem com ensure_ascii=True: \\uXXXX precisa virar acento", async () => {
  const stream = [
    `data: {"event": "message.delta", "run_id": "run_1", "timestamp": 1.0, "delta": "Configura\\u00e7\\u00e3o "}`,
    ``,
    `data: {"event": "message.delta", "run_id": "run_1", "timestamp": 2.0, "delta": "conclu\\u00edda \\ud83d\\ude80"}`,
    ``,
    `: stream closed`,
    ``,
  ].join("\n");

  const result = await consumeRunEventStream(makeResponse(stream, 1).response, "run_1");
  assert.equal(result.text, "Configuração concluída \u{1F680}");
});

test("frame com JSON corrompido é descartado sem derrubar o stream", async () => {
  const stream = [
    `data: {"event": "message.delta", "run_id": "run_1", "timestamp": 1.0, "delta": "antes"}`,
    ``,
    `data: {isso nao e json`,
    ``,
    `data: {"event": "message.delta", "run_id": "run_1", "timestamp": 2.0, "delta": "-depois"}`,
    ``,
    `: stream closed`,
    ``,
  ].join("\n");

  const result = await consumeRunEventStream(makeResponse(stream, 1).response, "run_1");
  assert.equal(result.text, "antes-depois");
  assert.equal(result.closedByServer, true);
});

test("abortar o stream de runs devolve aborted:true e libera o reader, sem lançar", { timeout: 5000 }, async () => {
  const partial = [
    `data: {"event": "message.delta", "run_id": "run_1", "timestamp": 1.0, "delta": "parcial"}`,
    ``,
    ``,
  ].join("\n");

  const probe = makeResponse(partial, Infinity, true); // socket vivo, sem evento terminal
  const controller = new AbortController();
  const pending = consumeRunEventStream(probe.response, "run_1", {}, controller.signal);

  setTimeout(() => controller.abort(), 20);
  const result = await pending;

  assert.equal(result.aborted, true);
  assert.equal(result.text, "parcial");
  assert.equal(result.terminalEvent, undefined, "abortar NÃO cancela a run no servidor (D-02)");
  assert.equal(probe.wasCancelled(), true);
  assert.equal(probe.response.body?.locked, false);
});

test("sinal já abortado antes de começar não lê nada e não vaza", { timeout: 5000 }, async () => {
  const probe = makeResponse(RUN_EVENTS_STREAM, Infinity, true);
  const controller = new AbortController();
  controller.abort();

  const result = await consumeRunEventStream(probe.response, "run_1", {}, controller.signal);
  assert.equal(result.aborted, true);
  assert.equal(result.text, "");
  assert.equal(probe.wasCancelled(), true);
});

/* ═══════════════ 8. Consumidor do stream de conversa da sessão ═══════════════ */

test("consumeSessionChatStream: captura literal, byte a byte, dá o mesmo resultado", async () => {
  const single = await consumeSessionChatStream(makeResponse(SESSION_CHAT_STREAM, Infinity).response, "raycast-abc");
  const byteByByte = await consumeSessionChatStream(makeResponse(SESSION_CHAT_STREAM, 1).response, "raycast-abc");

  assert.deepEqual(byteByByte, single);
  assert.equal(single.sessionId, "raycast-xyz", "o id EFETIVO de assistant.completed/run.completed vence");
  assert.equal(single.runId, "run_2f0c");
  assert.equal(single.messageId, "msg_9a7b");
  assert.equal(single.content, "Here are the files.");
  assert.deepEqual(single.usage, { input_tokens: 812, output_tokens: 96, total_tokens: 908 });
  assert.equal(single.messages.length, 2);
  assert.equal(single.completed, true);
  assert.equal(single.closedByServer, true);
  assert.equal(single.interrupted, false);
  assert.equal(single.aborted, false);
  assert.equal(single.errorMessage, undefined);
});

test("consumeSessionChatStream: deltas, ferramentas e keepalive", async () => {
  const texts: string[] = [];
  const toolsStarted: Array<[string, string | null]> = [];
  const toolsCompleted: string[] = [];
  const eventTypes: string[] = [];

  await consumeSessionChatStream(makeResponse(SESSION_CHAT_STREAM, 1).response, "raycast-abc", {
    onEvent: (event) => eventTypes.push(event.type),
    onText: (full) => texts.push(full),
    onToolStarted: (tool, preview) => toolsStarted.push([tool, preview]),
    onToolCompleted: (tool) => toolsCompleted.push(tool),
  });

  assert.deepEqual(eventTypes, [
    "run.started",
    "message.started",
    "tool.started",
    "tool.completed",
    "assistant.delta",
    "assistant.delta",
    "assistant.completed",
    "run.completed",
    "done",
  ]);
  assert.deepEqual(texts, ["Here are ", "Here are the files.", "Here are the files."]);
  assert.deepEqual(toolsStarted, [["terminal", "terminal(ls -la)"]]);
  assert.deepEqual(toolsCompleted, ["terminal"]);
});

test("o evento `done` termina o stream de conversa mesmo sem EOF", { timeout: 5000 }, async () => {
  const probe = makeResponse(SESSION_CHAT_STREAM, Infinity, true);
  const result = await consumeSessionChatStream(probe.response, "raycast-abc");

  assert.equal(result.closedByServer, true);
  assert.equal(result.content, "Here are the files.");
  assert.equal(probe.wasCancelled(), true);
  assert.equal(probe.response.body?.locked, false);
});

test("erro depois do stream aberto chega como evento `error` com HTTP 200", async () => {
  const stream = [
    `event: run.started`,
    `data: {"user_message": {"role": "user", "content": "oi"}, "session_id": "s1", "run_id": "r1", "seq": 1, "ts": 1.0}`,
    ``,
    `event: error`,
    `data: {"message": "falha ao contatar o provedor", "session_id": "s1", "run_id": "r1", "seq": 2, "ts": 2.0}`,
    ``,
    `event: done`,
    `data: {"session_id": "s1", "run_id": "r1", "seq": 3, "ts": 3.0}`,
    ``,
  ].join("\n");

  const errors: string[] = [];
  const result = await consumeSessionChatStream(makeResponse(stream, 1).response, "s1", {
    onError: (message) => errors.push(message),
  });

  assert.deepEqual(errors, ["falha ao contatar o provedor"]);
  assert.equal(result.errorMessage, "falha ao contatar o provedor");
  assert.equal(result.completed, false);
  assert.equal(result.closedByServer, true);
});

test("UTF-8 cru (ensure_ascii=False) sobrevive a chunks de 1 byte — nada de U+FFFD", async () => {
  const pedacos = ["Configuraç", "ão conclu", "ída ✅ 🚀 — ", "sem perdas"];
  const lines: string[] = [];
  pedacos.forEach((delta, index) => {
    lines.push(
      `event: assistant.delta`,
      `data: ${JSON.stringify({ message_id: "m1", delta, session_id: "s1", run_id: "r1", seq: index + 1, ts: 1.0 })}`,
      ``,
    );
  });
  lines.push(`event: done`, `data: {"session_id": "s1", "run_id": "r1", "seq": 9, "ts": 2.0}`, ``);

  const stream = lines.join("\n");
  const esperado = pedacos.join("");

  const byteByByte = await consumeSessionChatStream(makeResponse(stream, 1).response, "s1");
  const single = await consumeSessionChatStream(makeResponse(stream, Infinity).response, "s1");

  assert.equal(byteByByte.content, esperado);
  assert.equal(single.content, esperado);
  assert.equal(byteByByte.content.includes("�"), false, "TextDecoder precisa de { stream: true }");
});

test(
  "abortar o stream de conversa marca interrupted (aqui abortar INTERROMPE o turno)",
  { timeout: 5000 },
  async () => {
    const partial = [
      `event: assistant.delta`,
      `data: {"message_id": "m1", "delta": "come", "session_id": "s1", "run_id": "r1", "seq": 1, "ts": 1.0}`,
      ``,
      ``,
    ].join("\n");

    const probe = makeResponse(partial, Infinity, true);
    const controller = new AbortController();
    const pending = consumeSessionChatStream(probe.response, "s1", {}, controller.signal);

    setTimeout(() => controller.abort(), 20);
    const result = await pending;

    assert.equal(result.aborted, true);
    assert.equal(result.interrupted, true);
    assert.equal(result.content, "come", "o texto parcial dos deltas é preservado");
    assert.equal(result.completed, false);
    assert.equal(probe.wasCancelled(), true);
    assert.equal(probe.response.body?.locked, false);
  },
);

/* ═══════════════ 9. Discriminadores dos dois vocabulários ═══════════════ */

test("o tipo do evento de run vem do JSON, não do campo `event:` do SSE", () => {
  const frame: SseFrame = { data: '{"event": "message.delta", "run_id": "r1", "timestamp": 1.0, "delta": "oi"}' };
  const event = parseRunEvent(frame);
  assert.equal(event?.event, "message.delta");
  assert.equal(frame.event, undefined);

  // Sem `event` no JSON não há como discriminar: o frame é descartado.
  assert.equal(parseRunEvent({ data: '{"run_id": "r1"}' }), undefined);
  assert.equal(parseRunEvent({ data: "" }), undefined);
});

test("o tipo do evento de sessão vem do campo `event:` do SSE, copiado para `type`", () => {
  const event = parseSessionChatEvent({ event: "assistant.delta", data: '{"delta": "oi", "session_id": "s1"}' });
  assert.equal(event?.type, "assistant.delta");

  // Sem nome de evento não há discriminador.
  assert.equal(parseSessionChatEvent({ data: '{"delta": "oi"}' }), undefined);
});

/* ═══════════════ 10. Erros de transporte durante o stream ═══════════════ */

test("readSseFrames rejeita um Response sem corpo com erro de protocolo tipado", async () => {
  const response = new Response(null, { status: 200 });
  await assert.rejects(
    async () => {
      for await (const _frame of readSseFrames(response)) void _frame;
    },
    (err: unknown) => {
      assert.ok(err instanceof HermesProtocolError, "precisa ser um HermesError, não um Error cru");
      assert.equal(err.recovery, "report_bug");
      assert.match(err.technical, /no body/);
      return true;
    },
  );
});

test("queda da conexão no meio do stream sobe como HermesError, com o texto parcial já entregue", async () => {
  const texts: string[] = [];
  let pulls = 0;
  const stream = new ReadableStream<Uint8Array>({
    pull(controller) {
      pulls += 1;
      if (pulls === 1) {
        controller.enqueue(
          encoder.encode(`data: {"event": "message.delta", "run_id": "r1", "timestamp": 1.0, "delta": "meio da "}\n\n`),
        );
        return;
      }
      const dropped = new Error("terminated");
      (dropped as Error & { code?: string }).code = "ECONNRESET";
      controller.error(dropped);
    },
  });

  await assert.rejects(
    () => consumeRunEventStream(new Response(stream), "r1", { onText: (full) => texts.push(full) }),
    (err: unknown) => {
      assert.ok(err instanceof HermesError, "o erro cru precisa ser convertido antes de subir");
      assert.ok(err instanceof HermesConnectionError, "ECONNRESET é queda de conexão (E23)");
      return true;
    },
  );

  // O que já tinha chegado passou por onText: a UI mantém o texto parcial na tela (UX-SPEC E23).
  assert.deepEqual(texts, ["meio da "]);
});

/* ══════════════════════ createTextBuffer (armadilha 55) ══════════════════════ */

const wait = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms));

test("createTextBuffer: várias chamadas na janela viram UM flush, com o texto mais recente", async () => {
  const flushes: string[] = [];
  const buffer = createTextBuffer((text) => flushes.push(text), 20);

  buffer.push("a");
  buffer.push("ab");
  buffer.push("abc");
  assert.deepEqual(flushes, [], "nada pode ser publicado de forma síncrona");

  await wait(60);
  assert.deepEqual(flushes, ["abc"], "um único flush, com o acumulado mais recente");
});

test("createTextBuffer: flush() publica na hora e não deixa timer pendurado", async () => {
  const flushes: string[] = [];
  const buffer = createTextBuffer((text) => flushes.push(text), 50);

  buffer.push("parcial");
  buffer.flush();
  assert.deepEqual(flushes, ["parcial"]);

  await wait(80);
  assert.deepEqual(flushes, ["parcial"], "o timer agendado antes do flush foi cancelado");
});

test("createTextBuffer: cancel() descarta o flush pendente sem publicar", async () => {
  const flushes: string[] = [];
  const buffer = createTextBuffer((text) => flushes.push(text), 20);

  buffer.push("texto que chegou depois da desmontagem");
  buffer.cancel();

  await wait(60);
  assert.deepEqual(flushes, [], "cancel() é o que evita setState em componente desmontado");
});

test("createTextBuffer: janelas seguintes voltam a agendar", async () => {
  const flushes: string[] = [];
  const buffer = createTextBuffer((text) => flushes.push(text), 20);

  buffer.push("um");
  await wait(60);
  buffer.push("um dois");
  await wait(60);

  assert.deepEqual(flushes, ["um", "um dois"]);
});

/**
 * §6.2, último item: com "Mostrar a resposta enquanto o Hermes escreve" desligado, o
 * chamador NÃO passa `onText` — e a resposta final não pode se perder por causa disso. Duas
 * telas dependiam desta propriedade e só uma a respeitava: `run-progress.tsx` ligava
 * `onText` incondicionalmente, então a preferência não tinha efeito em `Executar tarefa`.
 */
test("consumeRunEventStream: sem `onText`, o texto e o `output` continuam completos", async () => {
  const comHandler = await consumeRunEventStream(makeResponse(RUN_EVENTS_STREAM, 1).response, "run_aa83", {
    onText: () => undefined,
  });
  const semHandler = await consumeRunEventStream(makeResponse(RUN_EVENTS_STREAM, 1).response, "run_aa83", {
    onText: undefined,
  });

  assert.equal(semHandler.text, comHandler.text);
  assert.equal(semHandler.output, comHandler.output);
  assert.equal(semHandler.terminalEvent, "run.completed");
  assert.equal(semHandler.output, "pronto");
});

test("consumeRunEventStream: sem `onText`, os demais handlers seguem recebendo eventos", async () => {
  const eventNames: string[] = [];
  await consumeRunEventStream(makeResponse(RUN_EVENTS_STREAM, 1).response, "run_aa83", {
    onEvent: (event) => eventNames.push(event.event),
  });

  assert.ok(eventNames.includes("run.completed"), "desligar o texto não pode silenciar o desfecho");
});
