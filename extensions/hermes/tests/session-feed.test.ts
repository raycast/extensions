import assert from "node:assert/strict";
import test from "node:test";

import { mergePolledFirstPage, type FeedSnapshot } from "../src/lib/session-feed.ts";
import type { Session, SessionListResponse } from "../src/lib/types.ts";

function session(id: string, pinned = false): Session {
  return { id, pinned, has_system_prompt: false, has_model_config: false };
}

function page(data: Session[], hasMore: boolean, limit = 2): SessionListResponse {
  return { object: "list", data, limit, offset: 0, has_more: hasMore };
}

test("atualiza a primeira página e preserva a cauda já carregada", () => {
  const current: FeedSnapshot = {
    items: [session("a"), session("b"), session("c"), session("d")],
    hasMore: true,
    nextOffset: 4,
    pages: 2,
  };

  const next = mergePolledFirstPage(current, page([session("new"), session("b")], true));

  assert.deepEqual(
    next.items.map(({ id }) => id),
    ["new", "b", "c", "d"],
  );
  assert.equal(next.pages, 2);
  assert.equal(next.hasMore, true);
  assert.equal(next.nextOffset, 4);
});

test("remove IDs duplicados da cauda, mantendo a ordem da primeira página", () => {
  const current: FeedSnapshot = {
    items: [session("a"), session("b"), session("c"), session("b")],
    hasMore: true,
    nextOffset: 3,
    pages: 3,
  };

  const next = mergePolledFirstPage(current, page([session("a"), session("c")], false));

  assert.deepEqual(
    next.items.map(({ id }) => id),
    ["a", "c"],
  );
  assert.equal(next.pages, 3);
  assert.equal(next.hasMore, false);
  assert.equal(next.nextOffset, 2);
});

test("remove da cauda um item antigo da primeira página quando outro sobe", () => {
  const current: FeedSnapshot = {
    items: [session("a"), session("b"), session("c"), session("d")],
    hasMore: true,
    nextOffset: 4,
    pages: 2,
  };

  const next = mergePolledFirstPage(current, page([session("a"), session("c")], true));

  assert.deepEqual(
    next.items.map(({ id }) => id),
    ["a", "c", "d"],
  );
});

test("conta somente sessões não fixadas no offset, incluindo a cauda preservada", () => {
  const current: FeedSnapshot = {
    items: [session("pin-old", true), session("old"), session("pin-tail", true), session("tail")],
    hasMore: true,
    nextOffset: 2,
    pages: 2,
  };

  const next = mergePolledFirstPage(current, page([session("pin-new", true), session("fresh")], true, 1));

  assert.deepEqual(
    next.items.map(({ id }) => id),
    ["pin-new", "fresh", "tail"],
  );
  assert.equal(next.nextOffset, 2);
});

test("com uma única página, não preserva itens antigos removidos pelo refresh", () => {
  const current: FeedSnapshot = {
    items: [session("stale-a"), session("stale-b")],
    hasMore: true,
    nextOffset: 2,
    pages: 1,
  };

  const next = mergePolledFirstPage(current, page([session("fresh")], false));

  assert.deepEqual(
    next.items.map(({ id }) => id),
    ["fresh"],
  );
  assert.equal(next.pages, 1);
  assert.equal(next.nextOffset, 1);
  assert.equal(next.hasMore, false);
});

test("polling não ressuscita has_more depois de a cauda inteira ter sido carregada", () => {
  // 5 sessões com limit 2: [a,b] [c,d] [e]. A última página disse has_more=false, mas a
  // PRIMEIRA continua dizendo true para sempre — ela só fala do que vem depois dela.
  const current: FeedSnapshot = {
    items: [session("a"), session("b"), session("c"), session("d"), session("e")],
    hasMore: false,
    nextOffset: 5,
    pages: 3,
  };

  const next = mergePolledFirstPage(current, page([session("a"), session("b")], true));

  assert.equal(next.hasMore, false);
  assert.deepEqual(
    next.items.map(({ id }) => id),
    ["a", "b", "c", "d", "e"],
  );
});

test("resposta sem limit utilizável ainda remove da cauda o item que sumiu da primeira página", () => {
  const current: FeedSnapshot = {
    items: [session("a"), session("b"), session("c"), session("d")],
    hasMore: true,
    nextOffset: 4,
    pages: 2,
  };
  // Sem `limit`, `Math.max(0, undefined)` daria NaN e a fronteira deixaria de existir:
  // "b" voltaria à lista e a ordem quebraria.
  const semLimite = {
    object: "list",
    data: [session("a"), session("c")],
    offset: 0,
    has_more: true,
  } as SessionListResponse;

  const next = mergePolledFirstPage(current, semLimite);

  assert.deepEqual(
    next.items.map(({ id }) => id),
    ["a", "c", "d"],
  );
});
