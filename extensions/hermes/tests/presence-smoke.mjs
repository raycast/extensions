/**
 * Smoke ao vivo (NÃO faz parte de `npm test`): exercita o caminho exato que a tela de
 * boas-vindas usa — `resolveBaseUrl()` sem chave nenhuma — contra o Hermes real desta
 * máquina. Rodar com `node tests/presence-smoke.mjs`.
 */
import "./helpers/module-hooks.mjs";

const { resolveBaseUrl } = await import("../src/lib/discovery.ts");
const { HermesWrongServerError } = await import("../src/lib/errors.ts");
const { __setPreferences } = await import("./helpers/raycast-api-stub.mjs");

function hostOf(baseUrl) {
  try {
    return new URL(baseUrl).host;
  } catch {
    return baseUrl;
  }
}

async function presence() {
  try {
    const endpoint = await resolveBaseUrl({ force: true });
    return { kind: "encontrado", host: hostOf(endpoint.baseUrl), version: endpoint.version, source: endpoint.source };
  } catch (err) {
    return { kind: err instanceof HermesWrongServerError ? "outroServidor" : "ausente" };
  }
}

// 1. descoberta real, sem chave e sem preferência — o caso do primeiro uso.
console.log("descoberta automática:", await presence());

// 2. a porta do adaptador de webhook precisa ser rejeitada, não aceita como Hermes.
__setPreferences({ apiUrl: "http://127.0.0.1:8644" });
console.log("porta do webhook:      ", await presence());

// 3. porta morta — o caso do Hermes desligado.
__setPreferences({ apiUrl: "http://127.0.0.1:8641" });
console.log("porta morta:           ", await presence());
