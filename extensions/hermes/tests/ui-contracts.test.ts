import test from "node:test";
import assert from "node:assert/strict";

import "./helpers/module-hooks.mjs";

const { mapHttpError } = await import("../src/lib/errors.ts");

/**
 * O jargão que nunca pode vazar para a copy. A lista sobreviveu à tradução da interface para
 * inglês porque a intenção dela não era "não escrever em inglês", e sim "não obrigar o usuário
 * a conhecer o vocabulário da API".
 *
 * O que mudou, e por quê:
 *
 * - saiu `histórico`, que era palavra portuguesa, e entrou `history` no lugar. A troca preserva
 *   a regra original: o produto chama isso de `conversation`, e `history` continua aparecendo
 *   só nos `keywords` do manifesto, que são busca e não texto de tela;
 * - `session`, `chat` e `thread` continuam banidos pelo mesmo motivo de sempre — são três
 *   sinônimos do que o produto chama de `conversation`, e cada um deles é o nome que uma
 *   camada técnica diferente usa;
 * - `run` continua banido como SUBSTANTIVO: o objeto que o servidor chama de run é `task` para
 *   quem lê a tela. O verbo (`Run a Task in Hermes`, `run one right now`) é inglês comum e
 *   segue livre — este teste varre mensagens de erro, não títulos de ação.
 */
const forbidden = /\b(API|endpoint|token|SSE|JSON|stream|run|session|chat|thread|history)\b/i;

test("copy nova de autorização e entrada usa o vocabulário de produto", () => {
  const messages = [
    mapHttpError({
      method: "GET",
      path: "/api/jobs",
      status: 401,
      body: '{"error":{"code":"gateway_auth_failed"}}',
    }).userMessage,
    mapHttpError({ method: "GET", path: "/api/sessions/s1/messages", status: 400, body: "invalid_pagination" })
      .userMessage,
    "Configure in Hermes Desktop",
    "The text is very long: I kept the beginning and the end and removed only the middle.",
    "The model you picked is not authenticated in Hermes. Open Hermes Desktop and set up the provider, or pick another model.",
  ];
  for (const message of messages) assert.doesNotMatch(message, forbidden, message);
});
