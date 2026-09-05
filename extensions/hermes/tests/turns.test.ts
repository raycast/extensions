/**
 * Testes de `src/lib/turns.ts` — a lógica pura da conversa contínua
 * (desenho `docs/superpowers/specs/2026-08-19-conversa-continua-design.md` §14).
 *
 * Três coisas moram aqui e em nenhum outro lugar, e as três só são verificáveis assim:
 *
 * 1. **O pareamento.** O Hermes grava uma troca como MUITAS mensagens: uma `user`, várias
 *    `assistant` de conteúdo vazio só com `tool_calls`, e uma `tool` por chamada. Foi o que
 *    a leitura ao vivo de `20260819_153125_397cfb` mostrou. Se o pareamento errar, a tela
 *    volta a ser o arquivo de mensagens que o usuário reclamou (§1 do desenho).
 * 2. **O corpo do painel.** O texto já recebido NUNCA é apagado por um erro (UX-SPEC §5.3),
 *    e o teto de 6.000 caracteres existe porque cada `setState` atravessa a ponte IPC.
 * 3. **A fila.** R9 diz "no máximo um turno vivo por conversa" e não há trava no servidor —
 *    medido ao vivo em 2026-08-19: duas execuções na mesma conversa são aceitas com 202 e
 *    rodam ao mesmo tempo. `nextQueued` É a trava.
 *
 * Executar: `node --test tests/turns.test.ts`
 */

import test from "node:test";
import assert from "node:assert/strict";

import "./helpers/module-hooks.mjs";
import type { RunStatus, SessionMessage } from "../src/lib/types.ts";
import { RUN_EXPIRED, RUN_EXPIRED_DETAIL, RUN_STATUS_APPEARANCE, RUN_STATUS_LABEL } from "../src/lib/status.ts";

const {
  MAX_TURN_CHARS,
  cancelBlockedQueue,
  isTurnFinished,
  isTurnLive,
  nextQueued,
  pairMessagesIntoTurns,
  pickTurnToRun,
  turnAppearance,
  turnMarkdown,
  turnTitle,
} = await import("../src/lib/turns.ts");
type Turn = Parameters<typeof turnMarkdown>[0];

/* ────────────────────────────── Fábricas ────────────────────────────── */

let nextMessageId = 1;

function message(role: SessionMessage["role"], content: string, extra: Partial<SessionMessage> = {}): SessionMessage {
  return { id: nextMessageId++, session_id: "s1", role, content, ...extra };
}

function turn(overrides: Partial<Turn> = {}): Turn {
  return { id: "t1", message: "e aí?", answer: "", steps: [], state: { kind: "queued" }, ...overrides };
}

function turnoVivo(status: RunStatus, id = "t1"): Turn {
  return turn({ id, state: { kind: "live", runId: "run_1", status }, startedAt: 1 });
}

/* ─────────────────────── pairMessagesIntoTurns ─────────────────────── */

test("pareia uma conversa normal numa troca por mensagem do usuário", () => {
  const turns = pairMessagesIntoTurns([
    message("user", "quanto é 2+2?"),
    message("assistant", "4"),
    message("user", "e 3+3?"),
    message("assistant", "6"),
  ]);

  assert.equal(turns.length, 2);
  assert.equal(turns[0].message, "quanto é 2+2?");
  assert.equal(turns[0].answer, "4");
  assert.equal(turns[1].message, "e 3+3?");
  assert.equal(turns[1].answer, "6");
  assert.deepEqual(
    turns.map((t) => t.state.kind),
    ["past", "past"],
  );
});

test("mensagens antes da primeira pergunta viram uma troca sem pergunta", () => {
  const turns = pairMessagesIntoTurns([
    message("system", "instruções internas"),
    message("assistant", "olá"),
    message("user", "oi"),
    message("assistant", "oi de volta"),
  ]);

  assert.equal(turns.length, 2);
  assert.equal(turns[0].message, "");
  assert.equal(turns[0].answer, "olá");
  assert.equal(turns[1].message, "oi");
});

test("mensagens de ferramenta ficam na troca que as pediu, nunca numa troca própria", () => {
  const turns = pairMessagesIntoTurns([
    message("user", "pesquise o clima"),
    message("assistant", "", {
      tool_calls: [{ id: "c1", type: "function", function: { name: "web_search", arguments: "{}" } }],
    }),
    message("tool", "[web_search] resultado bruto", { tool_name: "web_search" }),
    message("assistant", "Está chovendo."),
    message("user", "obrigado"),
    message("assistant", "de nada"),
  ]);

  assert.equal(turns.length, 2);
  assert.equal(turns[0].answer, "Está chovendo.");
  assert.deepEqual(turns[0].steps, ["🔧 Using web_search"]);
  assert.equal(turns[1].steps.length, 0);
});

test("junta as respostas do assistente e descarta as vazias de chamada de ferramenta", () => {
  const turns = pairMessagesIntoTurns([
    message("user", "faça duas coisas"),
    message("assistant", ""),
    message("assistant", "Primeiro passo pronto."),
    message("assistant", "   "),
    message("assistant", "Segundo passo pronto."),
  ]);

  assert.equal(turns.length, 1);
  assert.equal(turns[0].answer, "Primeiro passo pronto.\n\nSegundo passo pronto.");
});

test("uma pergunta ainda sem resposta vira uma troca de resposta vazia", () => {
  const turns = pairMessagesIntoTurns([
    message("user", "oi"),
    message("assistant", "olá"),
    message("user", "e agora?"),
  ]);

  assert.equal(turns.length, 2);
  assert.equal(turns[1].message, "e agora?");
  assert.equal(turns[1].answer, "");
});

test("lista vazia não gera troca nenhuma", () => {
  assert.deepEqual(pairMessagesIntoTurns([]), []);
});

test("ordena por identificador de mensagem e preserva a ordem cronológica", () => {
  const primeira = message("user", "primeira");
  const resposta = message("assistant", "resposta da primeira");
  const segunda = message("user", "segunda");

  const turns = pairMessagesIntoTurns([segunda, resposta, primeira]);

  assert.deepEqual(
    turns.map((t) => t.message),
    ["primeira", "segunda"],
  );
});

test("o identificador da troca é o da mensagem que a abriu", () => {
  const abertura = message("user", "oi");
  const turns = pairMessagesIntoTurns([abertura, message("assistant", "olá")]);

  assert.equal(turns[0].id, String(abertura.id));
});

/* ──────────────────────────── turnMarkdown ──────────────────────────── */

test("modo resposta mostra a pergunta acima da resposta", () => {
  const markdown = turnMarkdown(turn({ message: "quanto é 2+2?", answer: "4", state: { kind: "past" } }), "resposta");

  assert.equal(markdown, "**You**\n\nquanto é 2+2?\n\n---\n\n4");
});

test("modo etapas mostra as etapas no lugar da resposta", () => {
  const markdown = turnMarkdown(
    turn({
      answer: "resposta longa",
      steps: ["🔧 Using web_search", "✅ web_search finished in 0.4 s"],
      state: { kind: "past" },
    }),
    "etapas",
  );

  assert.match(markdown, /### Etapas/);
  assert.match(markdown, /🔧 Using web_search/);
  assert.match(markdown, /✅ web_search finished in 0\.4 s/);
  assert.doesNotMatch(markdown, /resposta longa/);
});

test("modo etapas sem etapa nenhuma diz isso, em vez de ficar em branco", () => {
  assert.match(turnMarkdown(turn({ state: { kind: "past" } }), "etapas"), /_No steps yet\._/);
});

test("turno que ainda não recebeu nada mostra Preparando", () => {
  assert.match(turnMarkdown(turnoVivo("queued"), "resposta"), /_Preparing…_/);
});

test("turno vivo há mais de três segundos mostra que o Hermes está pensando", () => {
  const markdown = turnMarkdown(turnoVivo("running"), "resposta", { thinking: true });

  assert.match(markdown, /_Hermes is thinking…_/);
  assert.doesNotMatch(markdown, /_Preparing…_/);
});

test("turno concluído sem texto nenhum diz que o Hermes não escreveu resposta", () => {
  const markdown = turnMarkdown(turnoVivo("completed"), "resposta");

  assert.match(markdown, /Hermes finished without writing an answer\./);
});

test("o erro do turno entra abaixo do texto já recebido, sem apagá-lo", () => {
  const markdown = turnMarkdown(
    turn({
      answer: "comecei a responder",
      state: { kind: "live", runId: "run_1", status: "failed" },
      error: { userMessage: "Hermes could not finish: no details" } as Turn["error"],
    }),
    "resposta",
  );

  const posicaoTexto = markdown.indexOf("comecei a responder");
  const posicaoErro = markdown.indexOf("Hermes could not finish");
  assert.ok(posicaoTexto >= 0, "o texto parcial precisa continuar na tela");
  assert.ok(posicaoErro > posicaoTexto, "o erro vem depois do texto, nunca no lugar dele");
});

test("o erro aparece mesmo quando nada tinha chegado antes", () => {
  const markdown = turnMarkdown(
    turn({
      state: { kind: "live", runId: "run_1", status: "failed" },
      error: { userMessage: "Hermes could not finish: no details" } as Turn["error"],
    }),
    "resposta",
  );

  assert.match(markdown, /Hermes could not finish/);
});

test("corta o texto no teto de caracteres e avisa que a mensagem é longa", () => {
  const markdown = turnMarkdown(
    turn({ answer: "x".repeat(MAX_TURN_CHARS + 500), state: { kind: "past" } }),
    "resposta",
  );

  assert.ok(markdown.length < MAX_TURN_CHARS + 500, "o corpo não pode carregar o texto inteiro");
  assert.match(markdown, /_Long message: showing only the beginning\._/);
});

test("a pergunta gigante também é cortada", () => {
  const markdown = turnMarkdown(
    turn({ message: "y".repeat(MAX_TURN_CHARS + 500), state: { kind: "past" } }),
    "resposta",
  );

  assert.ok(markdown.length < 2 * MAX_TURN_CHARS, "a pergunta não pode entrar inteira no corpo");
});

test("turno enfileirado que nunca chegou a ser enviado explica por quê", () => {
  const markdown = turnMarkdown(
    turn({ state: { kind: "live", status: "cancelled" }, startedAt: undefined }),
    "resposta",
  );

  assert.match(markdown, /> This message was never sent, because the previous answer had not finished\./);
});

test("turno que chegou a rodar e foi cancelado não recebe a explicação da fila", () => {
  const markdown = turnMarkdown(
    turn({
      answer: "parte",
      state: { kind: "live", runId: "run_1", status: "cancelled" },
      startedAt: 1,
      finishedAt: 2,
    }),
    "resposta",
  );

  assert.doesNotMatch(markdown, /never sent/);
});

test("execução expirada explica que o Hermes não sabe mais dela, e não vira Falhou", () => {
  const markdown = turnMarkdown(
    turn({ answer: "parte que chegou", state: { kind: "live", runId: "run_1", status: "running" }, expired: true }),
    "resposta",
  );

  assert.match(markdown, new RegExp(RUN_EXPIRED_DETAIL.slice(0, 40)));
  assert.match(markdown, /parte que chegou/);
  assert.doesNotMatch(markdown, /Failed/);
});

test("execução expirada sem texto nenhum não afirma que o Hermes deixou de escrever", () => {
  // Duas frases contraditórias sobre a mesma tarefa: "terminou sem escrever uma resposta"
  // diz que ela acabou, e o aviso de expiração diz que o Hermes esqueceu que ela existia.
  // Quem expirou não terminou — a explicação da expiração basta sozinha.
  const markdown = turnMarkdown(
    turn({ state: { kind: "live", runId: "run_1", status: "running" }, expired: true }),
    "resposta",
  );

  assert.doesNotMatch(markdown, /finished without writing an answer/);
  assert.match(markdown, new RegExp(RUN_EXPIRED_DETAIL.slice(0, 40)));
});

test("o erro sem texto nenhum não deixa duas linhas horizontais coladas", () => {
  const markdown = turnMarkdown(
    turn({
      state: { kind: "live", runId: "run_1", status: "failed" },
      error: { userMessage: "Hermes could not finish: no details" } as Turn["error"],
    }),
    "resposta",
  );

  assert.ok(
    !markdown.includes(`${"---"}

${"---"}`),
    "duas réguas seguidas viram um borrão no painel",
  );
  assert.match(markdown, /Hermes could not finish/);
});

test("a troca sem pergunta que expirou não abre o painel com uma régua solta", () => {
  const markdown = turnMarkdown(
    turn({ message: "", state: { kind: "live", runId: "run_1", status: "running" }, expired: true }),
    "resposta",
  );

  assert.ok(!markdown.startsWith("---"), "uma régua no topo do painel não separa nada");
  assert.match(markdown, new RegExp(RUN_EXPIRED_DETAIL.slice(0, 40)));
});

test("execução expirada conta como terminada: o Hermes não mexe mais nela", () => {
  const expirado = turn({ state: { kind: "live", runId: "r1", status: "running" }, expired: true });

  assert.equal(isTurnFinished(expirado), true, "sem isto o turno expirado fica sem Tentar novamente");
  assert.equal(isTurnLive(expirado), false, "sem isto um turno expirado seguraria a fila para sempre");
});

/* ─────────────────────── turnTitle e turnAppearance ─────────────────────── */

test("o título do turno é a pergunta, encurtada", () => {
  assert.equal(turnTitle(turn({ message: "quanto é 2+2?" })), "quanto é 2+2?");
  assert.ok(turnTitle(turn({ message: "z".repeat(200) })).length <= 61);
});

test("o título colapsa quebras de linha, porque o item da lista é uma linha só", () => {
  assert.equal(turnTitle(turn({ message: "primeira linha\nsegunda linha" })), "primeira linha segunda linha");
});

test("a troca sem pergunta é rotulada como parte anterior da conversa", () => {
  assert.equal(turnTitle(turn({ message: "", state: { kind: "past" } })), "Earlier part of this conversation");
});

test("turno enfileirado aparece como Preparando", () => {
  assert.equal(turnAppearance(turn({ state: { kind: "queued" } })).label, RUN_STATUS_LABEL.queued);
});

test("turno vindo do servidor com resposta aparece como Concluído", () => {
  const aparencia = turnAppearance(turn({ answer: "pronto", state: { kind: "past" } }));

  assert.equal(aparencia.label, RUN_STATUS_LABEL.completed);
  assert.equal(aparencia.icon, RUN_STATUS_APPEARANCE.completed.icon);
});

test("turno vindo do servidor ainda sem resposta aparece como Preparando", () => {
  assert.equal(turnAppearance(turn({ answer: "", state: { kind: "past" } })).label, RUN_STATUS_LABEL.queued);
});

test("turno vivo usa o rótulo do estado da execução", () => {
  assert.equal(turnAppearance(turnoVivo("waiting_for_approval")).label, RUN_STATUS_LABEL.waiting_for_approval);
  assert.equal(turnAppearance(turnoVivo("failed")).label, RUN_STATUS_LABEL.failed);
});

test("execução expirada tem rótulo próprio, nunca um dos 7 estados", () => {
  const aparencia = turnAppearance(turn({ state: { kind: "live", runId: "r1", status: "running" }, expired: true }));

  assert.equal(aparencia.label, RUN_EXPIRED.label);
  assert.equal(aparencia.icon, RUN_EXPIRED.icon);
});

/* ───────────────────────────── nextQueued ───────────────────────────── */

test("sem nenhum turno enfileirado não há próximo", () => {
  assert.equal(nextQueued([]), undefined);
  assert.equal(nextQueued([turn({ id: "a", state: { kind: "past" } })]), undefined);
});

test("dispara o primeiro enfileirado quando o anterior concluiu", () => {
  const fila = [
    turn({ id: "a", state: { kind: "live", runId: "r1", status: "completed" } }),
    turn({ id: "b", state: { kind: "queued" } }),
  ];

  assert.equal(nextQueued(fila)?.id, "b");
});

test("não dispara quando o turno anterior falhou", () => {
  const fila = [
    turn({ id: "a", state: { kind: "live", runId: "r1", status: "failed" } }),
    turn({ id: "b", state: { kind: "queued" } }),
  ];

  assert.equal(nextQueued(fila), undefined);
});

test("não dispara quando o turno anterior foi cancelado", () => {
  const fila = [
    turn({ id: "a", state: { kind: "live", runId: "r1", status: "cancelled" } }),
    turn({ id: "b", state: { kind: "queued" } }),
  ];

  assert.equal(nextQueued(fila), undefined);
});

test("com dois enfileirados dispara só o primeiro", () => {
  const fila = [
    turn({ id: "a", state: { kind: "past" } }),
    turn({ id: "b", state: { kind: "queued" } }),
    turn({ id: "c", state: { kind: "queued" } }),
  ];

  assert.equal(nextQueued(fila)?.id, "b");
});

test("R9: não dispara enquanto houver um turno vivo na conversa", () => {
  for (const status of ["queued", "running", "waiting_for_approval", "stopping"] as const) {
    const fila = [
      turn({ id: "a", state: { kind: "live", runId: "r1", status } }),
      turn({ id: "b", state: { kind: "queued" } }),
    ];
    assert.equal(nextQueued(fila), undefined, `um turno em ${status} precisa segurar a fila`);
  }
});

test("um turno enfileirado no começo da lista dispara sem exigir turno anterior", () => {
  assert.equal(nextQueued([turn({ id: "a", state: { kind: "queued" } })])?.id, "a");
});

/* ──────────────────── pickTurnToRun e cancelBlockedQueue ──────────────────── */

test("Tentar novamente fura a recusa de disparar depois de um erro", () => {
  const fila = [
    turn({ id: "a", state: { kind: "live", runId: "r1", status: "failed" } }),
    turn({ id: "b", state: { kind: "queued" } }),
  ];

  assert.equal(nextQueued(fila), undefined, "sozinha, a fila não dispararia");
  assert.equal(pickTurnToRun(fila, "b")?.id, "b", "mas o pedido explícito do usuário dispara");
});

test("um pedido explícito que não existe mais não trava a fila", () => {
  const fila = [
    turn({ id: "a", state: { kind: "live", runId: "r1", status: "completed" } }),
    turn({ id: "b", state: { kind: "queued" } }),
  ];

  assert.equal(pickTurnToRun(fila, "fantasma")?.id, "b");
});

test("nem o pedido explícito dispara em cima de um turno vivo (R9)", () => {
  const fila = [
    turn({ id: "a", state: { kind: "live", runId: "r1", status: "running" } }),
    turn({ id: "b", state: { kind: "queued" } }),
  ];

  assert.equal(pickTurnToRun(fila, "b"), undefined);
});

test("a fila presa por um erro anterior vira Cancelado, com a explicação", () => {
  const fila = [
    turn({ id: "a", state: { kind: "live", runId: "r1", status: "failed" } }),
    turn({ id: "b", state: { kind: "queued" } }),
    turn({ id: "c", state: { kind: "queued" } }),
  ];

  const depois = cancelBlockedQueue(fila, new Set());

  assert.deepEqual(
    depois.map((t) => (t.state.kind === "live" ? t.state.status : t.state.kind)),
    ["failed", "cancelled", "cancelled"],
  );
  assert.match(turnMarkdown(depois[1], "resposta"), /never sent/);
});

test("um turno que já foi disparado nunca é cancelado pela varredura da fila", () => {
  const fila = [
    turn({ id: "a", state: { kind: "live", runId: "r1", status: "failed" } }),
    turn({ id: "b", state: { kind: "queued" } }),
  ];

  const depois = cancelBlockedQueue(fila, new Set(["b"]));

  assert.equal(depois, fila, "sem mudança, a mesma lista — para não provocar re-render");
});

test("fila que pode disparar não é cancelada", () => {
  const fila = [
    turn({ id: "a", state: { kind: "live", runId: "r1", status: "completed" } }),
    turn({ id: "b", state: { kind: "queued" } }),
  ];

  assert.equal(cancelBlockedQueue(fila, new Set()), fila);
});

test("com turno vivo a fila espera, não é cancelada", () => {
  const fila = [
    turn({ id: "a", state: { kind: "live", runId: "r1", status: "running" } }),
    turn({ id: "b", state: { kind: "queued" } }),
  ];

  assert.equal(cancelBlockedQueue(fila, new Set()), fila);
});

test("mensagem criada depois do cancelamento anterior continua na fila", () => {
  const turns = [turnoVivo("cancelled", "old"), turn({ id: "new", queuedAt: 2, message: "nova pergunta" })].map(
    (item, index) => (index === 0 ? { ...item, finishedAt: 1 } : item),
  );
  const swept = cancelBlockedQueue(turns, new Set());
  assert.equal(swept[1]?.state.kind, "queued");
});

test("turno cancelado depois de ser aceito não diz que nunca foi enviado", () => {
  const markdown = turnMarkdown(
    turn({ state: { kind: "live", runId: "r1", status: "cancelled" }, transportPhase: "accepted", startedAt: 1 }),
    "resposta",
  );
  assert.doesNotMatch(markdown, /never sent/);
});

test("resposta concluída com aviso do provedor continua concluída", () => {
  const markdown = turnMarkdown(
    turn({
      answer: "⚠️ Provider authentication failed",
      state: { kind: "live", runId: "r1", status: "completed" },
      transportPhase: "reconciling",
      diagnostic: { kind: "provider_authentication", message: "Configure o provedor." },
    }),
    "resposta",
  );
  assert.match(markdown, /Provider authentication failed/);
  assert.doesNotMatch(markdown, /never sent/);
});
