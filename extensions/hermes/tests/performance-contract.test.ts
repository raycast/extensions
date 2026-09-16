import test from "node:test";
import assert from "node:assert/strict";

import "./helpers/module-hooks.mjs";

const { createTurnDerivationCache } = await import("../src/lib/turn-derivations.ts");
type Turn = import("../src/lib/turns.ts").Turn;

function makeTurn(id: string, answer = ""): Turn {
  return { id, message: `pergunta ${id}`, answer, steps: [], state: { kind: "past" } };
}

test("cache de derivação reutiliza turnos antigos quando só o turno vivo muda", () => {
  const cache = createTurnDerivationCache();
  const old = makeTurn("old", "resposta");
  const live = makeTurn("live");
  const firstOld = cache.get(old, "resposta", false);
  const firstLive = cache.get(live, "resposta", false);
  const secondOld = cache.get(old, "resposta", false);
  const changedLive = { ...live, answer: "novo delta", revision: 1 };
  const secondLive = cache.get(changedLive, "resposta", false);

  assert.equal(secondOld, firstOld);
  assert.equal(secondLive === firstLive, false);
});

test("cache separa a janela de pensamento sem recalcular a linha em outras janelas", () => {
  const cache = createTurnDerivationCache();
  const turn = makeTurn("t1");
  const steady = cache.get(turn, "resposta", false);
  const thinking = cache.get(turn, "resposta", true);
  assert.notEqual(thinking.markdown, steady.markdown);
  assert.equal(cache.get(turn, "resposta", true), thinking);
});

test("cache padrão limita a 128 entradas e recalcula ao revisitar a primeira", () => {
  const cache = createTurnDerivationCache();
  const turns = Array.from({ length: 130 }, (_, index) => makeTurn(String(index)));
  const first = cache.get(turns[0], "resposta", false);
  for (const turn of turns.slice(1)) cache.get(turn, "resposta", false);

  assert.notEqual(cache.get(turns[0], "resposta", false), first);
});

test("cache atualiza a recência ao reutilizar uma entrada", () => {
  const cache = createTurnDerivationCache(2);
  const first = makeTurn("lru-first");
  const second = makeTurn("lru-second");
  const third = makeTurn("lru-third");
  const firstValue = cache.get(first, "resposta", false);
  const secondValue = cache.get(second, "resposta", false);

  assert.equal(cache.get(first, "resposta", false), firstValue);
  cache.get(third, "resposta", false);

  assert.notEqual(cache.get(second, "resposta", false), secondValue);
});

test("cache usa um limite finito quando recebe NaN ou infinito", () => {
  for (const invalid of [Number.NaN, Number.POSITIVE_INFINITY, Number.NEGATIVE_INFINITY]) {
    const cache = createTurnDerivationCache(invalid);
    const turns = Array.from({ length: 130 }, (_, index) => makeTurn(`${invalid}-${index}`));
    const first = cache.get(turns[0], "resposta", false);
    for (const turn of turns.slice(1)) cache.get(turn, "resposta", false);

    assert.notEqual(cache.get(turns[0], "resposta", false), first);
  }
});

test("cache recalcula quando a revisão do turno muda", () => {
  const cache = createTurnDerivationCache();
  const turn = { ...makeTurn("revision"), revision: 1 };
  const first = cache.get(turn, "resposta", false);

  turn.answer = "nova resposta";
  turn.revision = 2;
  assert.notEqual(cache.get(turn, "resposta", false), first);
});
