/**
 * Prova que o mapeamento de estados é TOTAL e BIJETIVO: os 7 status literais do
 * Hermes cobrem os 7 rótulos pt-BR, um para um, sem status órfão nem rótulo
 * repetido — e que as duas condições que não são status (UX-SPEC §4.3) nunca se
 * disfarçam de "Falhou" ou "Cancelado".
 *
 * Roda com `node --test` (D-07), sem dependência nenhuma.
 */

import { test } from "node:test";
import assert from "node:assert/strict";

import type { RunStatus } from "../src/lib/types.ts";
import {
  JOB_STATE_LABEL,
  NO_CONNECTION,
  RUN_EXPIRED,
  RUN_EXPIRED_DETAIL,
  RUN_STATUS_APPEARANCE,
  RUN_STATUS_LABEL,
  STREAM_PHASE_LABEL,
  TERMINAL_RUN_STATUSES,
  UNKNOWN_STATUS_LABEL,
  isTerminalRunStatus,
  jobStateLabel,
  runStatusAppearance,
  runStatusLabel,
} from "../src/lib/status.ts";
import type { Tint } from "../src/lib/status.ts";

/**
 * Resolve um `Tint` para o valor que o Raycast usaria no tema pedido: uma cor do Raycast
 * é a mesma string nos dois temas; uma cor do Hermes tem um hex por tema.
 */
function tom(tint: Tint, tema: "light" | "dark"): string {
  return typeof tint === "string" ? tint : tint[tema];
}

/**
 * Enumerados a partir de todo `_set_run_status(...)` do api_server 0.20.4
 * (pesquisa 04 §2.3). Se o servidor ganhar um oitavo, este array precisa mudar
 * junto — e é isso que faz o teste de cobertura falhar em vez de passar calado.
 */
const STATUS_DO_FIO = [
  "queued",
  "running",
  "waiting_for_approval",
  "stopping",
  "completed",
  "cancelled",
  "failed",
] as const satisfies readonly RunStatus[];

/** Os 7 rótulos obrigatórios do brief, na ordem da UX-SPEC §4.1. */
const ROTULOS_CANONICOS = [
  "Preparing",
  "Running",
  "Waiting for approval",
  "Stopping",
  "Done",
  "Cancelled",
  "Failed",
] as const;

const ordenado = (valores: readonly string[]): string[] => [...valores].sort();

test("RUN_STATUS_LABEL cobre exatamente os 7 status do fio, sem sobra nem falta", () => {
  assert.deepEqual(ordenado(Object.keys(RUN_STATUS_LABEL)), ordenado(STATUS_DO_FIO));
  assert.equal(Object.keys(RUN_STATUS_LABEL).length, 7);
});

test("os rótulos usados são exatamente os 7 canônicos", () => {
  assert.deepEqual(ordenado(Object.values(RUN_STATUS_LABEL)), ordenado(ROTULOS_CANONICOS));
});

test("nenhum status mapeia para dois rótulos e nenhum rótulo tem dois status", () => {
  const rotulos = Object.values(RUN_STATUS_LABEL);
  assert.equal(new Set(rotulos).size, rotulos.length, "há rótulo repetido: o mapeamento deixou de ser 1 para 1");
  assert.equal(new Set(Object.keys(RUN_STATUS_LABEL)).size, 7);
});

test("cada status tem um rótulo não vazio e nada cai em 'Desconhecido'", () => {
  for (const status of STATUS_DO_FIO) {
    const rotulo = runStatusLabel(status);
    assert.equal(rotulo, RUN_STATUS_LABEL[status]);
    assert.notEqual(rotulo, UNKNOWN_STATUS_LABEL);
    assert.ok(rotulo.length > 0);
  }
});

test("ícone e cor batem com a tabela da UX-SPEC §4.1", () => {
  assert.deepEqual(ordenado(Object.keys(RUN_STATUS_APPEARANCE)), ordenado(STATUS_DO_FIO));
  assert.deepEqual(RUN_STATUS_APPEARANCE, {
    queued: { icon: "clock-16", color: "raycast-secondary-text" },
    running: { icon: "circle-progress-16", color: { light: "#0053fd", dark: "#0053fd" } },
    waiting_for_approval: { icon: "warning-16", color: { light: "#fe9a00", dark: "#fe9a00" } },
    stopping: { icon: "stop-16", color: { light: "#c08532", dark: "#c08532" } },
    completed: { icon: "check-circle-16", color: { light: "#1f8a65", dark: "#55a583" } },
    cancelled: { icon: "minus-circle-16", color: "raycast-secondary-text" },
    failed: { icon: "x-mark-circle-16", color: { light: "#cf2d56", dark: "#e75e78" } },
  });
});

test("as cores que carregam significado à distância não se repetem entre estados de sentido oposto", () => {
  // `notEqual` sobre objetos compara REFERÊNCIA: com cores em objeto `{light,dark}` ele
  // passaria sempre, e a assertiva viraria decorativa sem ninguém perceber. Comparar o
  // hex resolvido em cada tema é o que de fato prova que as cores são distinguíveis.
  for (const tema of ["light", "dark"] as const) {
    assert.notEqual(tom(RUN_STATUS_APPEARANCE.completed.color, tema), tom(RUN_STATUS_APPEARANCE.failed.color, tema));
    assert.notEqual(
      tom(RUN_STATUS_APPEARANCE.running.color, tema),
      tom(RUN_STATUS_APPEARANCE.waiting_for_approval.color, tema),
    );
  }
});

test("as cores com significado vêm da paleta do Hermes, não das cores prontas do Raycast", () => {
  // O que este teste protege: a extensão deve mostrar a MESMA cor de estado que o Hermes
  // Desktop. Voltar para "raycast-blue" e companhia compilaria e passaria em todo o resto
  // — a regressão seria invisível sem esta trava. Hexes conferidos em
  // `apps/desktop/src/styles.css` (bloco claro `:196-202`, bloco `:root.dark` `:517-551`).
  const doHermes = ["running", "waiting_for_approval", "stopping", "completed", "failed"] as const;
  for (const status of doHermes) {
    const cor = RUN_STATUS_APPEARANCE[status].color;
    assert.equal(typeof cor, "object", `${status} deveria usar a paleta do Hermes, não uma cor pronta do Raycast`);
    for (const tema of ["light", "dark"] as const) {
      assert.match(tom(cor, tema), /^#[0-9a-f]{6}$/, `${status}/${tema} precisa ser um hex de 6 dígitos em minúsculas`);
    }
  }

  // Os neutros continuam vindo do Raycast de propósito: eles têm de acompanhar o texto
  // secundário do tema do usuário, e um hex fixo brigaria com ele.
  for (const status of ["queued", "cancelled"] as const) {
    assert.equal(RUN_STATUS_APPEARANCE[status].color, "raycast-secondary-text");
  }
  assert.equal(RUN_EXPIRED.color, "raycast-secondary-text");

  // Um vermelho só: falha de execução e falta de conexão são a mesma cor (o DESIGN.md do
  // Hermes manda um único tratamento de erro em toda parte).
  assert.deepEqual(NO_CONNECTION.color, RUN_STATUS_APPEARANCE.failed.color);
});

test("terminalidade: só completed, cancelled e failed — stopping não é terminal", () => {
  assert.deepEqual(ordenado([...TERMINAL_RUN_STATUSES]), ordenado(["cancelled", "completed", "failed"]));
  for (const status of ["completed", "cancelled", "failed"] as const) {
    assert.equal(isTerminalRunStatus(status), true, `${status} deveria ser terminal`);
  }
  for (const status of ["queued", "running", "waiting_for_approval", "stopping"] as const) {
    assert.equal(isTerminalRunStatus(status), false, `${status} não pode ser terminal`);
  }
  assert.equal(isTerminalRunStatus(undefined), false);
  assert.equal(isTerminalRunStatus("started"), false);
});

test("'started' é o campo do 202, não um estado", () => {
  assert.equal(Object.hasOwn(RUN_STATUS_LABEL, "started"), false);
  assert.equal(runStatusLabel("started"), UNKNOWN_STATUS_LABEL);
});

test("status desconhecido degrada com segurança, sem inventar um dos 7 rótulos", () => {
  for (const desconhecido of ["", "in_progress", "succeeded", "timeout", "interrupted"]) {
    assert.equal(runStatusLabel(desconhecido), UNKNOWN_STATUS_LABEL);
  }
  assert.equal(runStatusLabel(undefined), UNKNOWN_STATUS_LABEL);
  // o neutro, nunca o vermelho de falha
  assert.deepEqual(runStatusAppearance("timeout"), { icon: "circle-16", color: "raycast-secondary-text" });
  assert.deepEqual(runStatusAppearance(undefined), { icon: "circle-16", color: "raycast-secondary-text" });
});

test("runStatusAppearance devolve a mesma dupla da tabela para status conhecidos", () => {
  for (const status of STATUS_DO_FIO) {
    assert.deepEqual(runStatusAppearance(status), RUN_STATUS_APPEARANCE[status]);
  }
});

test("'Execução expirada' é condição, não estado: nunca é 'Falhou' nem 'Cancelado'", () => {
  assert.equal(RUN_EXPIRED.label, "Task expired");
  assert.equal(
    Object.values(RUN_STATUS_LABEL).includes(RUN_EXPIRED.label as never),
    false,
    "a condição de expiração não pode estar no vocabulário de estados",
  );
  assert.notEqual(RUN_EXPIRED.label, RUN_STATUS_LABEL.failed);
  assert.notEqual(RUN_EXPIRED.label, RUN_STATUS_LABEL.cancelled);
  assert.deepEqual(
    { icon: RUN_EXPIRED.icon, color: RUN_EXPIRED.color },
    { icon: "question-mark-circle-16", color: "raycast-secondary-text" },
  );
  assert.equal(
    RUN_EXPIRED_DETAIL,
    "Hermes no longer has any information about this task. It may have finished normally.",
  );
});

test("'Sem conexão' é condição do cliente e também fica fora do vocabulário de estados", () => {
  assert.equal(NO_CONNECTION.label, "No connection");
  assert.equal(Object.values(RUN_STATUS_LABEL).includes(NO_CONNECTION.label as never), false);
  assert.notEqual(NO_CONNECTION.label, RUN_EXPIRED.label);
  assert.deepEqual(NO_CONNECTION.color, { light: "#cf2d56", dark: "#e75e78" });
  assert.ok(NO_CONNECTION.icon.length > 0);
});

test("STREAM_PHASE_LABEL reaproveita o mesmo vocabulário, sem criar rótulo novo", () => {
  for (const rotulo of Object.values(STREAM_PHASE_LABEL)) {
    assert.ok(
      (ROTULOS_CANONICOS as readonly string[]).includes(rotulo),
      `a fase de stream introduziu o rótulo fora do vocabulário: ${rotulo}`,
    );
  }
  assert.equal(STREAM_PHASE_LABEL.idle, RUN_STATUS_LABEL.queued);
  assert.equal(STREAM_PHASE_LABEL.running, RUN_STATUS_LABEL.running);
  assert.equal(STREAM_PHASE_LABEL.failed, RUN_STATUS_LABEL.failed);
});

test("nenhum sinônimo proibido aparece em rótulo nenhum", () => {
  const proibidos = ["In progress", "Executing", "Finished", "Error", "Aborted", "Complete", "Success"];
  const todos = [
    ...Object.values(RUN_STATUS_LABEL),
    ...Object.values(STREAM_PHASE_LABEL),
    RUN_EXPIRED.label,
    NO_CONNECTION.label,
  ];
  for (const proibido of proibidos) {
    assert.equal(todos.includes(proibido as never), false, `sinônimo proibido em uso: ${proibido}`);
  }
});

test("JOB_STATE_LABEL cobre os 4 estados de automação e degrada como os demais", () => {
  assert.deepEqual(ordenado(Object.keys(JOB_STATE_LABEL)), ordenado(["completed", "error", "paused", "scheduled"]));
  assert.equal(jobStateLabel("scheduled"), "Scheduled");
  assert.equal(jobStateLabel("error"), RUN_STATUS_LABEL.failed);
  assert.equal(jobStateLabel("nada_disso"), UNKNOWN_STATUS_LABEL);
  assert.equal(jobStateLabel(undefined), UNKNOWN_STATUS_LABEL);
});
