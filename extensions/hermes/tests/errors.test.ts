/**
 * Testes de `src/lib/errors.ts`.
 *
 * Roda com o runner nativo: `node --test tests/` (D-07). Sem dependências.
 * Restrição do type-stripping nativo: nada de `enum`, `namespace`, decorators
 * ou `import =`.
 *
 * Os corpos abaixo são LITERAIS — copiados das capturas ao vivo em
 * `docs/research/*.md` e `docs/research/fixtures/CAPTURAS-AO-VIVO.md`, incluindo
 * os separadores `": "` e `", "` do aiohttp onde a captura os mostra.
 */

import { test } from "node:test";
import assert from "node:assert/strict";

import {
  HermesAbortError,
  HermesAuthError,
  HermesConflictError,
  HermesConnectionError,
  HermesError,
  HermesForbiddenError,
  HermesNotFoundError,
  HermesNotSupportedError,
  HermesOriginBlockedError,
  HermesPayloadTooLargeError,
  HermesProtocolError,
  HermesRateLimitError,
  HermesScheduleError,
  HermesServerError,
  HermesTimeoutError,
  HermesUnavailableError,
  HermesValidationError,
  RECOVERY_LABEL,
  REDACTED_SECRET,
  isAbort,
  registerSecret,
  mapHttpError,
  parseErrorBody,
  sanitizeTechnical,
  toHermesError,
} from "../src/lib/errors.ts";

import type { HttpErrorContext } from "../src/lib/errors.ts";

/** Contexto mínimo; cada teste sobrescreve o que importa. */
function ctx(over: Partial<HttpErrorContext>): HttpErrorContext {
  return { method: "GET", path: "/v1/models", status: 500, body: "", ...over };
}

/* ───────────────────────────── 401 (literal) ───────────────────────────── */

const BODY_401 =
  '{"error": {"message": "Invalid gateway API key (API_SERVER_KEY)", "type": "gateway_auth_error", "code": "gateway_auth_failed"}}';

test("401 gateway_auth_failed vira HermesAuthError com a frase E2", () => {
  const e = mapHttpError(ctx({ method: "GET", path: "/v1/models", status: 401, body: BODY_401 }));

  assert.ok(e instanceof HermesAuthError);
  assert.equal(e.code, "gateway_auth_failed");
  assert.equal(e.type, "gateway_auth_error");
  assert.equal(e.httpStatus, 401);
  assert.equal(e.status, 401); // apelido lido pelo retry de hermes-api.ts
  assert.equal(e.userMessage, "Hermes did not accept the access key. It may have changed since the last time.");
  assert.equal(e.recovery, "open_preferences");
  assert.equal(e.recoveryLabel, "Open Settings");
  assert.equal(e.retryable, false);
  assert.equal(e.uxId, "E2");
});

test("401: a decisão vem do code, não da frase do servidor", () => {
  // Mesmo code, mensagem completamente diferente (o servidor redige a dele).
  const outro =
    '{"error": {"message": "qualquer outra coisa", "type": "gateway_auth_error", "code": "gateway_auth_failed"}}';
  const e = mapHttpError(ctx({ status: 401, body: outro }));
  assert.ok(e instanceof HermesAuthError);
  assert.equal(e.userMessage, "Hermes did not accept the access key. It may have changed since the last time.");
});

test("401 nunca ecoa o corpo do servidor na mensagem do usuário", () => {
  const e = mapHttpError(ctx({ status: 401, body: BODY_401 }));
  assert.ok(!e.userMessage.includes("API_SERVER_KEY"));
  assert.ok(!e.userMessage.includes("gateway_auth"));
  assert.equal(e.message, e.userMessage); // Error.message é o texto de tela
});

/* ─────────────────────── 403 de corpo vazio (CORS) ─────────────────────── */

test("403 com corpo vazio vira HermesOriginBlockedError e acusa o header Origin", () => {
  const e = mapHttpError(ctx({ method: "POST", path: "/v1/runs", status: 403, body: "" }));

  assert.ok(e instanceof HermesOriginBlockedError);
  assert.ok(!(e instanceof HermesForbiddenError));
  assert.equal(e.code, null);
  assert.equal(e.userMessage, "Could not talk to Hermes because of a security restriction on the server.");
  assert.equal(e.recovery, "report_bug");
  assert.equal(e.uxId, "E5");
  assert.match(e.technical, /Origin/);
});

test("403 com corpo só de espaços continua sendo o caso do Origin", () => {
  const e = mapHttpError(ctx({ status: 403, body: "\n  \r\n" }));
  assert.ok(e instanceof HermesOriginBlockedError);
});

test("403 com JSON de API key ausente vira HermesForbiddenError (E6)", () => {
  const body =
    '{"error": {"message": "Session continuation requires API key authentication. Configure API_SERVER_KEY to enable this feature.", "type": "invalid_request_error", "param": null, "code": null}}';
  const e = mapHttpError(ctx({ method: "POST", path: "/v1/chat/completions", status: 403, body }));

  assert.ok(e instanceof HermesForbiddenError);
  assert.ok(!(e instanceof HermesOriginBlockedError));
  assert.equal(e.code, null);
  assert.equal(e.type, "invalid_request_error");
  assert.equal(
    e.userMessage,
    "Hermes is running with no access key set up, and it does not accept this kind of request.",
  );
  assert.equal(e.uxId, "E6");
});

/* ──────────────────────────── 404 (variantes) ──────────────────────────── */

test("404 em text/plain (corpo não-JSON) não quebra o parser", () => {
  const e = mapHttpError(ctx({ method: "GET", path: "/api/nope", status: 404, body: "404: Not Found" }));

  assert.ok(e instanceof HermesNotFoundError);
  assert.equal(e.code, null);
  assert.equal(e.type, null);
  assert.equal(e.userMessage, "Hermes could not find what was asked for.");
  assert.equal(e.recovery, "report_bug");
  assert.match(e.technical, /404: Not Found/);
});

test("404 session_not_found aponta o Hermes Desktop (E7)", () => {
  const body =
    '{"error": {"message": "Session not found: nope", "type": "invalid_request_error", "param": null, "code": "session_not_found"}}';
  const e = mapHttpError(ctx({ path: "/api/sessions/nope/messages", status: 404, body }));

  assert.ok(e instanceof HermesNotFoundError);
  assert.equal(e.code, "session_not_found");
  assert.equal(
    e.userMessage,
    "This conversation no longer exists in Hermes. It may have been deleted in Hermes Desktop.",
  );
  assert.equal(e.recovery, "reload_list");
  assert.equal(e.uxId, "E7");
});

const BODY_RUN_404 =
  '{"error":{"message":"Run not found: run_missing","type":"invalid_request_error","param":null,"code":"run_not_found"}}';

test("404 run_not_found fora do stream é E8", () => {
  const e = mapHttpError(ctx({ path: "/v1/runs/run_missing", status: 404, body: BODY_RUN_404 }));
  assert.equal(e.uxId, "E8");
  assert.equal(e.recovery, "reload_list");
  assert.equal(e.retryable, false);
});

test("404 run_not_found ao abrir o stream é E9 e não perde a tarefa", () => {
  const e = mapHttpError(ctx({ path: "/v1/runs/run_missing/events", status: 404, body: BODY_RUN_404 }));
  assert.equal(e.uxId, "E9");
  assert.equal(e.userMessage, "I lost the live view of this task, but it is still going inside Hermes.");
  assert.equal(e.retryable, true);
});

test("404 de perfil desconhecido (envelope legado de string) manda para as configurações", () => {
  const e = mapHttpError(
    ctx({ path: "/p/outro/v1/models", status: 404, body: '{"error": "Unknown or unconfigured profile"}' }),
  );
  assert.equal(e.userMessage, "The profile you gave does not exist in this Hermes.");
  assert.equal(e.recovery, "open_preferences");
});

test("404 em rota de jobs é discriminado pela rota, não pela frase", () => {
  const e = mapHttpError(ctx({ path: "/api/jobs/abc", status: 404, body: '{"error": "Job not found"}' }));
  assert.equal(e.userMessage, "This automation no longer exists.");
  assert.equal(e.recovery, "reload_list");
});

/* ──────────────────────────────── 400 ──────────────────────────────── */

test("400 invalid_title é validação de formulário (E11)", () => {
  const body =
    '{"error": {"message": "Title already in use by session 20260819_153125_397cfb", "type": "invalid_request_error", "param": null, "code": "invalid_title"}}';
  const e = mapHttpError(ctx({ method: "POST", path: "/api/sessions", status: 400, body }));

  assert.ok(e instanceof HermesValidationError);
  assert.equal(e.code, "invalid_title");
  assert.equal(e.userMessage, "There is already a conversation with that title. Pick another name.");
  assert.equal(e.recovery, "change_input");
  assert.equal(e.uxId, "E11");
});

test("400 dos campos de sessão vira uma frase só, sem jargão", () => {
  for (const code of ["unsupported_session_field", "invalid_session_field", "invalid_session_id"]) {
    const body = `{"error": {"message": "seja lá o que for", "type": "invalid_request_error", "param": null, "code": "${code}"}}`;
    const e = mapHttpError(ctx({ method: "PATCH", path: "/api/sessions/x", status: 400, body }));
    assert.ok(e instanceof HermesValidationError, code);
    assert.equal(e.userMessage, "Could not save that change to the conversation.", code);
    assert.equal(e.recovery, "report_bug", code);
  }
});

test("400 invalid_steer_input pede a orientação (E14)", () => {
  const body =
    '{"error": {"message": "steer text is required", "type": "invalid_request_error", "param": null, "code": "invalid_steer_input"}}';
  const e = mapHttpError(ctx({ method: "POST", path: "/v1/runs/run_x/steer", status: 400, body }));
  assert.equal(e.userMessage, "Write your guidance before sending.");
  assert.equal(e.uxId, "E14");
});

test("400 invalid_pagination e invalid_content_length são retentáveis", () => {
  for (const code of ["invalid_pagination", "invalid_content_length"]) {
    const body = `{"error": {"message": "x", "type": "invalid_request_error", "param": null, "code": "${code}"}}`;
    const e = mapHttpError(ctx({ status: 400, body }));
    assert.equal(e.retryable, true, code);
    assert.equal(e.recovery, "retry", code);
  }
});

test("400 desconhecido cai no genérico de validação, sem lançar", () => {
  const body =
    '{"error": {"message": "algo novo", "type": "invalid_request_error", "param": null, "code": "codigo_que_nao_existe_ainda"}}';
  const e = mapHttpError(ctx({ status: 400, body }));
  assert.ok(e instanceof HermesValidationError);
  assert.equal(e.userMessage, "Hermes rejected the data that was sent.");
  assert.equal(e.code, "codigo_que_nao_existe_ainda");
});

/* ──────────────────────────────── 409 ──────────────────────────────── */

test("409 session_exists é retentável com outro id (E10)", () => {
  const body =
    '{"error": {"message": "Session already exists: raycast-2026-08-19-abc123", "type": "invalid_request_error", "param": null, "code": "session_exists"}}';
  const e = mapHttpError(ctx({ method: "POST", path: "/api/sessions", status: 409, body }));

  assert.ok(e instanceof HermesConflictError);
  assert.equal(e.code, "session_exists");
  assert.equal(e.userMessage, "There is already a conversation with that identifier. I will create another one.");
  assert.equal(e.recovery, "retry");
  assert.equal(e.retryable, true);
  assert.equal(e.uxId, "E10");
});

test("409 de aprovação e de steer têm textos distintos", () => {
  const aprovacao =
    '{"error": {"message": "x", "type": "invalid_request_error", "param": null, "code": "approval_not_pending"}}';
  const steer =
    '{"error": {"message": "x", "type": "invalid_request_error", "param": null, "code": "run_not_accepting_steer"}}';

  assert.equal(mapHttpError(ctx({ status: 409, body: aprovacao })).uxId, "E12");
  assert.equal(mapHttpError(ctx({ status: 409, body: steer })).uxId, "E13");
});

test("409 desconhecido não herda a frase de steer", () => {
  const body =
    '{"error": {"message": "x", "type": "invalid_request_error", "param": null, "code": "algum_conflito_novo"}}';
  const e = mapHttpError(ctx({ status: 409, body }));
  assert.ok(e instanceof HermesConflictError);
  assert.ok(!e.userMessage.includes("orientar"));
  assert.equal(e.recovery, "reload_list");
});

/* ────────────────────────── 413 / 429 / 501 / 503 ────────────────────────── */

test("413 body_too_large sugere dividir o texto (E15)", () => {
  const body =
    '{"error": {"message": "Request body too large.", "type": "invalid_request_error", "param": null, "code": "body_too_large"}}';
  const e = mapHttpError(ctx({ method: "POST", path: "/v1/runs", status: 413, body }));

  assert.ok(e instanceof HermesPayloadTooLargeError);
  assert.equal(
    e.userMessage,
    "Your text is too big for Hermes to handle in one go. Try splitting it into smaller parts.",
  );
  assert.equal(e.recovery, "reduce_size");
  assert.equal(e.uxId, "E15");
});

test("429 rate_limit_exceeded lê o header Retry-After", () => {
  const body =
    '{"error": {"message": "Too many concurrent runs (max 10)", "type": "rate_limit_error", "param": null, "code": "rate_limit_exceeded"}}';
  const e = mapHttpError(ctx({ method: "POST", path: "/v1/runs", status: 429, retryAfter: "1", body }));

  assert.ok(e instanceof HermesRateLimitError);
  assert.equal(e.retryAfterSeconds, 1);
  assert.equal(e.retryable, true);
  assert.equal(e.recovery, "wait_and_retry");
  assert.equal(e.uxId, "E16");
  assert.ok(!e.userMessage.includes("max 10")); // nada de jargão do servidor
});

test("429 sem Retry-After (ou com lixo) usa 1 segundo", () => {
  const body = '{"error": {"message": "x", "type": "rate_limit_error", "param": null, "code": "rate_limit_exceeded"}}';
  const semHeader = mapHttpError(ctx({ status: 429, body }));
  const comLixo = mapHttpError(ctx({ status: 429, retryAfter: "Wed, 21 Oct 2026 07:28:00 GMT", body }));

  assert.ok(semHeader instanceof HermesRateLimitError);
  assert.ok(comLixo instanceof HermesRateLimitError);
  assert.equal((semHeader as HermesRateLimitError).retryAfterSeconds, 1);
  assert.equal((comLixo as HermesRateLimitError).retryAfterSeconds, 1);
});

test("501 do módulo de cron (envelope legado) desliga as automações", () => {
  const e = mapHttpError(
    ctx({ method: "GET", path: "/api/jobs", status: 501, body: '{"error": "Cron module not available"}' }),
  );

  assert.ok(e instanceof HermesNotSupportedError);
  assert.equal(e.userMessage, "Automations are not available in this Hermes.");
  assert.equal(e.recovery, "none");
  assert.equal(e.recoveryLabel, null);
  assert.equal(e.uxId, "E19");
});

test("401 de Automações vai para primeiro uso, não para erro genérico", () => {
  const error = mapHttpError(
    ctx({
      method: "GET",
      path: "/api/jobs?include_disabled=true",
      status: 401,
      body: '{"error":{"code":"gateway_auth_failed"}}',
    }),
  );
  assert.equal(error.constructor.name, "HermesNotConfiguredError");
  assert.equal(error.recovery, "open_preferences");
});

test("503 gateway_draining e session_db_unavailable têm recuperações diferentes", () => {
  const draining =
    '{"error": {"message": "Gateway is draining existing work; retry shortly.", "type": "invalid_request_error", "param": null, "code": "gateway_draining"}}';
  const db =
    '{"error": {"message": "x", "type": "invalid_request_error", "param": null, "code": "session_db_unavailable"}}';

  const a = mapHttpError(ctx({ status: 503, retryAfter: "1", body: draining }));
  const b = mapHttpError(ctx({ status: 503, body: db }));

  assert.ok(a instanceof HermesUnavailableError);
  assert.equal(a.recovery, "wait_and_retry");
  assert.equal((a as HermesUnavailableError).retryAfterSeconds, 1);
  assert.equal(a.uxId, "E17");

  assert.ok(b instanceof HermesUnavailableError);
  assert.equal(b.recovery, "start_hermes");
  assert.equal(b.uxId, "E18");
  assert.equal(b.retryable, true);
});

/* ─────────────────────────────── 5xx ─────────────────────────────── */

test("502 agent_incomplete (corpo literal com o bloco hermes) é E20", () => {
  const body = JSON.stringify({
    error: {
      message: "Agent run did not produce a response.",
      type: "server_error",
      param: null,
      code: "agent_incomplete",
      hermes: { completed: false, partial: true, failed: false },
    },
  });
  const e = mapHttpError(ctx({ method: "POST", path: "/v1/chat/completions", status: 502, body }));

  assert.ok(e instanceof HermesServerError);
  assert.equal(e.code, "agent_incomplete");
  assert.equal(e.retryable, true);
  assert.equal(e.uxId, "E20");
});

test("500 com 'Invalid schedule' é erro de campo, não de servidor", () => {
  const e = mapHttpError(
    ctx({ method: "POST", path: "/api/jobs", status: 500, body: '{"error": "Invalid schedule: amanha as 9"}' }),
  );

  assert.ok(e instanceof HermesScheduleError);
  assert.ok(e instanceof HermesValidationError);
  assert.equal(e.recovery, "change_input");
  assert.match(e.userMessage, /every 30m/);
});

test("500 genérico é retentável", () => {
  const e = mapHttpError(
    ctx({ status: 500, body: '{"error": {"message": "boom", "type": "server_error", "code": null}}' }),
  );
  assert.ok(e instanceof HermesServerError);
  assert.equal(e.userMessage, "Hermes hit an internal error.");
  assert.equal(e.retryable, true);
});

test("status fora do catálogo vira erro de protocolo em vez de exceção", () => {
  const e = mapHttpError(ctx({ status: 418, body: "sou um bule" }));
  assert.ok(e instanceof HermesProtocolError);
  assert.equal(e.userMessage, "Hermes answered in a way the extension did not understand.");
  assert.equal(e.uxId, "E24");
});

/* ──────────────────── Corpos malformados: nunca lançar ──────────────────── */

test("parseErrorBody aceita qualquer lixo sem lançar", () => {
  assert.deepEqual(parseErrorBody(""), { raw: "", empty: true });
  assert.equal(parseErrorBody("   ").empty, true);
  assert.equal(parseErrorBody("<html>502 Bad Gateway</html>").message, "<html>502 Bad Gateway</html>");
  assert.equal(parseErrorBody('{"error": null}').code, undefined);
  assert.equal(parseErrorBody('{"error": 42}').empty, false);
  assert.equal(parseErrorBody("[1,2,3]").empty, false);
  assert.equal(parseErrorBody("null").empty, false);
  assert.equal(parseErrorBody('{"sem_envelope": true}').code, undefined);
  assert.equal(parseErrorBody('{"error": {"message": 7, "code": 9}}').message, undefined);
  assert.equal(parseErrorBody('{"error": {"message": 7, "code": 9}}').code, null);
});

test("mapHttpError não lança para nenhum corpo malformado", () => {
  const corpos = ["", "   ", "null", "[1,2,3]", '{"error": null}', '{"error": 42}', "{", "<html/>", '"texto"'];
  for (const body of corpos) {
    for (const status of [400, 401, 403, 404, 409, 413, 429, 500, 501, 503, 599, 302]) {
      const e = mapHttpError(ctx({ status, body }));
      assert.ok(e instanceof HermesError, `${status} ${body}`);
      assert.ok(e.userMessage.length > 0, `${status} ${body}`);
      assert.ok(Object.prototype.hasOwnProperty.call(RECOVERY_LABEL, e.recovery), `${status} ${body}`);
    }
  }
});

test("o corpo cru é truncado antes de virar detalhe técnico", () => {
  const e = mapHttpError(ctx({ status: 500, body: "x".repeat(50_000) }));
  assert.ok(e.technical.length <= 4001); // 4000 + o marcador de corte
});

/* ─────────────────────── Segurança: redação de segredos ─────────────────────── */

test("sanitizeTechnical remove um token Bearer de qualquer texto", () => {
  const chave = "sk-hermes-9f3a1c7e4b2d8a6f0e5c3b1d7a9f2e4c";
  const texto = `Falha ao chamar /v1/models usando Bearer ${chave} no cabeçalho.`;
  const limpo = sanitizeTechnical(texto);

  assert.ok(!limpo.includes(chave), "o token não pode sobreviver à redação");
  assert.ok(limpo.includes("Bearer ***"));
  assert.ok(limpo.includes("/v1/models"), "o resto do diagnóstico continua legível");
});

test("sanitizeTechnical apaga o valor de uma linha Authorization inteira", () => {
  const chave = "sk-hermes-9f3a1c7e4b2d8a6f0e5c3b1d7a9f2e4c";
  const dump = `POST /v1/runs\nAuthorization: Bearer ${chave}\nContent-Type: application/json`;
  const limpo = sanitizeTechnical(dump);

  assert.ok(!limpo.includes(chave));
  assert.match(limpo, /Authorization: \*\*\*/);
  assert.ok(limpo.includes("Content-Type: application/json"));
});

test("sanitizeTechnical cobre bearer minúsculo e variações de nome de chave", () => {
  const casos = [
    "bearer abc123def456ghi789",
    "API_SERVER_KEY=abc123def456ghi789",
    "api_server_key: abc123def456ghi789",
    '"api_key": "abc123def456ghi789"',
    "?api_key=abc123def456ghi789&limit=10",
    "token=abc123def456ghi789",
  ];
  for (const caso of casos) {
    assert.ok(!sanitizeTechnical(caso).includes("abc123def456ghi789"), caso);
  }
  assert.ok(sanitizeTechnical("?api_key=abc123def456ghi789&limit=10").includes("limit=10"));
});

test("sanitizeTechnical redige o valor literal da chave quando ele é informado", () => {
  const chave = "9f3a1c7e4b2d8a6f";
  const texto = `A configuração aponta para ${chave} em dois lugares: ${chave}.`;
  const limpo = sanitizeTechnical(texto, [chave]);

  assert.ok(!limpo.includes(chave));
  assert.equal(limpo.split(REDACTED_SECRET).length - 1, 2);
});

test("sanitizeTechnical não destrói identificadores públicos nem contagem de tokens", () => {
  const texto =
    'run_e4118ab9ebc24b1ab1878f6cfb8e2866 / api_1787173253_21269392 / "total_tokens": 20130 / code=run_not_found';
  assert.equal(sanitizeTechnical(texto), texto);
});

test("technical é redigido no construtor, mesmo quando o segredo vem do corpo HTTP", () => {
  const chave = "sk-hermes-vazou-no-corpo-do-erro";
  const body = `{"error": {"message": "upstream disse: Authorization: Bearer ${chave}", "type": "server_error", "code": null}}`;
  const e = mapHttpError(ctx({ status: 500, body }));

  assert.ok(!e.technical.includes(chave));
  assert.ok(!e.userMessage.includes(chave));
});

test("toHermesError também redige o que vem na exceção", () => {
  const falha = new Error("connect falhou com Bearer sk-hermes-token-secreto-abc");
  const e = toHermesError(falha, "GET /v1/models");
  assert.ok(!e.technical.includes("sk-hermes-token-secreto-abc"));
});

/* ─────────────────────── Falhas de rede e cancelamento ─────────────────────── */

test("ECONNREFUSED embrulhado pelo fetch do Node vira HermesConnectionError (E1)", () => {
  const causa = Object.assign(new Error("connect ECONNREFUSED 127.0.0.1:8642"), { code: "ECONNREFUSED" });
  const falha = Object.assign(new TypeError("fetch failed"), { cause: causa });

  const e = toHermesError(falha, "GET /health");

  assert.ok(e instanceof HermesConnectionError);
  assert.equal(e.recovery, "start_hermes");
  assert.equal(e.retryable, true);
  assert.equal(e.uxId, "E1");
  assert.match(e.userMessage, /^Could not connect to Hermes\./);
  assert.match(e.technical, /ECONNREFUSED/);
});

test("código de rede escondido em AggregateError também é encontrado", () => {
  const agregado = Object.assign(
    new AggregateError([Object.assign(new Error("dns"), { code: "ENOTFOUND" })], "fetch failed"),
    {},
  );
  const e = toHermesError(agregado, "GET /health");
  assert.ok(e instanceof HermesConnectionError);
});

test("timeout do AbortSignal vira HermesTimeoutError (E25) e não erro de conexão", () => {
  const falha = Object.assign(new Error("The operation was aborted due to timeout"), { name: "TimeoutError" });
  const e = toHermesError(falha, "POST /v1/runs");

  assert.ok(e instanceof HermesTimeoutError);
  assert.equal(e.userMessage, "Hermes is taking longer than expected to answer.");
  assert.equal(e.retryable, true);
  assert.equal(e.uxId, "E25");
});

test("timeout de corpo/cabeçalho do undici também é timeout", () => {
  const falha = Object.assign(new Error("Headers Timeout Error"), { code: "UND_ERR_HEADERS_TIMEOUT" });
  assert.ok(toHermesError(falha) instanceof HermesTimeoutError);
});

test("AbortError do usuário é silencioso e reconhecido por isAbort", () => {
  const falha = Object.assign(new Error("The operation was aborted"), { name: "AbortError" });
  const e = toHermesError(falha, "desmontagem");

  assert.ok(e instanceof HermesAbortError);
  assert.equal(e.recovery, "none");
  assert.equal(e.retryable, false);
  assert.equal(isAbort(e), true);
  assert.equal(isAbort(falha), true);
  assert.equal(isAbort(new Error("outra coisa")), false);
});

test("toHermesError devolve o HermesError original sem reembrulhar", () => {
  const original = mapHttpError(ctx({ status: 401, body: BODY_401 }));
  assert.equal(toHermesError(original, "de novo"), original);
});

test("toHermesError aceita qualquer coisa lançada, inclusive não-erros", () => {
  for (const jogado of ["boom", 42, null, undefined, { foo: "bar" }, []]) {
    const e = toHermesError(jogado, "contexto");
    assert.ok(e instanceof HermesError);
    assert.ok(e.userMessage.length > 0);
  }
  assert.ok(toHermesError("boom") instanceof HermesProtocolError);
});

test("falha de persistência local vira erro acionável de retentativa", () => {
  const error = toHermesError({
    name: "StoragePersistenceError",
    message: "falha local",
    userMessage: "Não consegui salvar o estado local desta execução. Tente novamente.",
  });
  assert.equal(error.userMessage, "Não consegui salvar o estado local desta execução. Tente novamente.");
  assert.equal(error.retryable, true);
});

/* ─────────────────────────── Contrato da UI ─────────────────────────── */

test("toda ação de recuperação tem rótulo definido", () => {
  const acoes = [
    "open_preferences",
    "retry",
    "wait_and_retry",
    "start_hermes",
    "reload_list",
    "change_input",
    "reduce_size",
    "report_bug",
    "none",
  ] as const;
  for (const acao of acoes) {
    assert.ok(acao in RECOVERY_LABEL, acao);
  }
  assert.equal(RECOVERY_LABEL.none, null);
});

test("nenhuma mensagem de usuário carrega jargão de HTTP ou de código", () => {
  const amostras = [
    mapHttpError(ctx({ status: 401, body: BODY_401 })),
    mapHttpError(ctx({ status: 403, body: "" })),
    mapHttpError(ctx({ status: 404, body: "404: Not Found" })),
    mapHttpError(ctx({ status: 429, retryAfter: "1", body: '{"error":{"code":"rate_limit_exceeded"}}' })),
    mapHttpError(ctx({ status: 503, body: '{"error":{"code":"gateway_draining"}}' })),
    toHermesError(Object.assign(new TypeError("fetch failed"), { cause: { code: "ECONNREFUSED" } })),
  ];
  for (const e of amostras) {
    assert.doesNotMatch(e.userMessage, /HTTP|\b\d{3}\b|error\.|_[a-z]+_|null|undefined/, e.userMessage);
  }
});

/* ═══════════════ Passada LITERAL do segredo (UX-SPEC §5.1 regra 5) ═══════════════ */

/**
 * A regra 5 manda substituir "qualquer ocorrência da chave", não só as que vêm num formato
 * reconhecível. `BEARER_RE` e `CREDENTIAL_ASSIGNMENT_RE` cobrem `Bearer …` e `chave=…`; um
 * eco CRU do valor (`KeyError: '9f3a…'`, `unknown credential 9f3a…`) não casa com nenhum
 * dos dois. Quem monta o bloco em render síncrono não pode aguardar `resolveApiKey()`, e
 * era exatamente por isso que três telas chamavam `sanitizeTechnical(text)` sem `secrets`.
 */

/** Valor sentinela: não é uma chave real. */
const SEGREDO_REGISTRADO = "NAO_E_UMA_CHAVE_REAL_registro_9f3a1c";

test("segurança: um segredo registrado é apagado mesmo sem passar `secrets`", () => {
  registerSecret(SEGREDO_REGISTRADO);

  const ecos = [
    `KeyError: '${SEGREDO_REGISTRADO}'`,
    `{"detail":"unknown credential ${SEGREDO_REGISTRADO}"}`,
    `Traceback: gateway rejeitou ${SEGREDO_REGISTRADO} na porta 8642`,
  ];

  for (const eco of ecos) {
    const limpo = sanitizeTechnical(eco);
    assert.ok(!limpo.includes(SEGREDO_REGISTRADO), `sobrou a chave em: ${limpo}`);
    assert.ok(limpo.includes(REDACTED_SECRET), `faltou o marcador em: ${limpo}`);
  }
});

test("segurança: o registro alcança o `technical` do construtor de HermesError", () => {
  registerSecret(SEGREDO_REGISTRADO);

  const e = mapHttpError(
    ctx({ status: 401, body: `{"error":{"message":"unknown credential ${SEGREDO_REGISTRADO}"}}` }),
  );

  assert.ok(!e.technical.includes(SEGREDO_REGISTRADO), e.technical);
  assert.ok(!JSON.stringify(e.userMessage).includes(SEGREDO_REGISTRADO));
});

test("segurança: valores curtos NÃO são registrados — casariam com texto legítimo", () => {
  registerSecret("abc");
  const texto = "o id abc123 continua legível";
  assert.equal(sanitizeTechnical(texto), texto);
});
