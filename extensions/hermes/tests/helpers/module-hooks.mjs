/**
 * Hooks de resolução de módulo para o runner nativo (`node --test`), sem nenhuma dependência.
 *
 * Resolve dois problemas que só aparecem fora do bundler do Raycast:
 *
 * 1. `@raycast/api` não tem runtime — o pacote instalado é só `types/`. Aqui ele é
 *    redirecionado para o duplo em memória `raycast-api-stub.mjs`.
 * 2. O Node carrega os `.ts` do projeto como ESM (o `package.json` não declara `type`, e a
 *    detecção de sintaxe encontra `import`/`export`), e em ESM o especificador precisa da
 *    extensão. Os módulos de `src/lib/` usam imports sem extensão porque o `tsconfig.json`
 *    é `commonjs`; o hook completa o `.ts` quando o arquivo existe.
 *
 * COMO USAR: importe este módulo ANTES de carregar qualquer coisa de `src/lib/`, e traga o
 * módulo sob teste com `await import(...)` no corpo do arquivo — imports estáticos são
 * içados e resolvidos antes de qualquer código rodar, o que registraria os hooks tarde demais.
 *
 *   import "./helpers/module-hooks.mjs";
 *   const discovery = await import("../src/lib/discovery.ts");
 */

import { existsSync } from "node:fs";
import { registerHooks } from "node:module";
import { fileURLToPath } from "node:url";

const RAYCAST_API_STUB = new URL("./raycast-api-stub.mjs", import.meta.url).href;
const HAS_EXTENSION = /\.[cm]?[jt]s$/;

registerHooks({
  resolve(specifier, context, nextResolve) {
    if (specifier === "@raycast/api") {
      return { url: RAYCAST_API_STUB, shortCircuit: true };
    }

    if (specifier.startsWith(".") && !HAS_EXTENSION.test(specifier) && context.parentURL) {
      const candidate = new URL(`${specifier}.ts`, context.parentURL);
      if (existsSync(fileURLToPath(candidate))) {
        return { url: candidate.href, shortCircuit: true };
      }
    }

    return nextResolve(specifier, context);
  },
});
