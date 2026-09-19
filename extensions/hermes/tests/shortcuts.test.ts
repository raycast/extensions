/**
 * A tabela de atalhos, conferida contra o que o Raycast REALMENTE faz — não contra o que
 * um comentário afirma que ele faz.
 *
 * Este arquivo existe por um defeito concreto: `src/components/shortcuts.ts` documentava
 * `Common.Pin` como `Cmd+Shift+P` no macOS, e uma justificativa inteira (mais um teste, mais
 * um passo do checklist manual) foi escrita em cima dessa colisão. O runtime do Raycast 2.0.3
 * diz `Cmd+.`. A colisão nunca existiu. Nada quebrava, mas o checklist mandava um humano
 * conferir um encontro impossível, e a regra de manutenção protegia um perigo imaginário.
 *
 * Um `Common.*` não é legível pelo `tsc` nem pelo `node --test`: o `@raycast/api` do projeto
 * só tem tipos. Os valores estão transcritos em `helpers/raycast-api-stub.mjs`, com a origem
 * anotada. É isso que permite resolver cada atalho para teclas concretas aqui.
 *
 * O que fica travado:
 *  - todo atalho resolve para uma combinação concreta nos DOIS sistemas;
 *  - nenhuma ação divide combinação com outra, exceto o par documentado em §9.3;
 *  - nada cai em cima do que o Raycast reserva, usando a mesma normalização do host;
 *  - o bloco Windows é, tecla por tecla, a tabela §9.2 da UX-SPEC.
 */

import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

import "./helpers/module-hooks.mjs";

const { SHORTCUTS } = await import("../src/components/shortcuts.ts");
const { Keyboard } = await import("./helpers/raycast-api-stub.mjs");

const root = fileURLToPath(new URL("..", import.meta.url));

type Combo = { modifiers: string[]; key: string };
type Platform = "Windows" | "macOS";

/** A normalização do próprio host: `alt` e `opt` são a mesma tecla, `windows` é o `cmd`. */
function normalizeModifier(modifier: string): string {
  const lower = modifier.toLocaleLowerCase();
  if (lower === "alt") return "opt";
  if (lower === "windows") return "cmd";
  return lower;
}

/** Uma combinação vira texto estável: modificadores em ordem fixa, depois a tecla. */
function label(combo: Combo): string {
  return [...combo.modifiers.map(normalizeModifier)].sort().concat(combo.key.toLocaleLowerCase()).join("+");
}

/** Resolve um atalho — `Common.*` ou `perPlatform()` — para as teclas de um sistema. */
function resolve(shortcut: unknown, platform: Platform): Combo {
  const record = shortcut as Record<string, unknown>;
  const branch = "macOS" in record ? record[platform] : record;
  assert.ok(branch, `atalho sem bloco ${platform}`);
  const combo = branch as Combo;
  assert.ok(Array.isArray(combo.modifiers), `bloco ${platform} sem modifiers`);
  assert.equal(typeof combo.key, "string", `bloco ${platform} sem key`);
  return combo;
}

const NAMES = Object.keys(SHORTCUTS) as Array<keyof typeof SHORTCUTS>;

/**
 * §9.3: `Ctrl+Shift+D` serve a `Detectar configuração automaticamente` e a
 * `Ver mensagens e ferramentas`. As duas nunca aparecem na mesma tela — as telas que detectam
 * configuração não têm conversa. É a ÚNICA divisão de tecla admitida.
 */
const COLISOES_ADMITIDAS = [["autoDetect", "viewMessages"]];

test("todo atalho resolve para teclas concretas nos dois sistemas", () => {
  assert.ok(NAMES.length >= 25, `esperava a tabela inteira, li ${NAMES.length} atalhos`);

  for (const name of NAMES) {
    for (const platform of ["Windows", "macOS"] as Platform[]) {
      const combo = resolve(SHORTCUTS[name], platform);
      assert.ok(combo.key.length > 0, `${name}: tecla vazia no ${platform}`);
    }
  }
});

test("nenhuma ação divide combinação com outra, fora do par que a §9.3 admite", () => {
  for (const platform of ["Windows", "macOS"] as Platform[]) {
    const porCombinacao = new Map<string, string[]>();
    for (const name of NAMES) {
      const chave = label(resolve(SHORTCUTS[name], platform));
      porCombinacao.set(chave, [...(porCombinacao.get(chave) ?? []), name]);
    }

    const divididas = [...porCombinacao.values()].filter((names) => names.length > 1).map((names) => names.sort());
    assert.deepEqual(divididas, COLISOES_ADMITIDAS, `no ${platform} há atalho dividido fora do que a §9.3 admite`);
  }
});

test("nada cai em cima do que o Raycast reserva", () => {
  const reservados = new Map(
    Object.entries(Keyboard.Shortcut.Reserved).map(([nome, combo]) => [label(combo as Combo), nome]),
  );

  for (const platform of ["Windows", "macOS"] as Platform[]) {
    for (const name of NAMES) {
      const chave = label(resolve(SHORTCUTS[name], platform));
      assert.equal(
        reservados.get(chave),
        undefined,
        `${name} no ${platform} usa ${chave}, que o Raycast reserva para ${reservados.get(chave)}`,
      );
    }
  }
});

test("`Parar` e `Fixar conversa` não dividem tecla em sistema nenhum", () => {
  // A justificativa antiga dizia que `stop` e `Common.Pin` eram a mesma tecla no macOS.
  // Não são: `Common.Pin` é `Cmd+.`/`Ctrl+.`, e `stop` é `Cmd+Shift+P`/`Ctrl+Shift+P`.
  // O teste guarda a afirmação nova para que ela não volte a ser escrita de cabeça.
  for (const platform of ["Windows", "macOS"] as Platform[]) {
    assert.notEqual(
      label(resolve(SHORTCUTS.stop, platform)),
      label(resolve(SHORTCUTS.pin, platform)),
      `${platform}: se estas duas passarem a colidir, a §9.3 exige separá-las por tela`,
    );
  }
  assert.equal(label(resolve(SHORTCUTS.pin, "macOS")), "cmd+.");
  assert.equal(label(resolve(SHORTCUTS.pin, "Windows")), "ctrl+.");
});

/** Lê a coluna `Atalho` da tabela §9.2, pulando as linhas sem `Keyboard.Shortcut`. */
function tabelaDaSpec(): Set<string> {
  const spec = readFileSync(`${root}/docs/UX-SPEC.md`, "utf8").replace(/\r\n/g, "\n");
  const secao = spec.slice(spec.indexOf("### 9.2 Tabela global"));
  const tabela = secao.slice(0, secao.indexOf("\n\n**Ações sem atalho"));

  const combinacoes = new Set<string>();
  for (const linha of tabela.split("\n")) {
    const colunas = linha.split("|").map((coluna) => coluna.trim().replace(/`/g, ""));
    // Fora: o cabeçalho, o separador `|---|`, e as linhas cuja ação não tem `Keyboard.Shortcut`.
    if (colunas.length < 4 || colunas[2] === "—" || colunas[1] === "Atalho" || !/[a-z0-9.]/i.test(colunas[1])) continue;
    const partes = colunas[1].split("+");
    combinacoes.add(label({ modifiers: partes.slice(0, -1), key: partes[partes.length - 1] }));
  }

  assert.ok(combinacoes.size >= 25, `esperava a tabela §9.2 inteira, li ${combinacoes.size} linhas`);
  return combinacoes;
}

test("o bloco Windows é, tecla por tecla, a tabela §9.2 da UX-SPEC", () => {
  const noCodigo = new Set(NAMES.map((name) => label(resolve(SHORTCUTS[name], "Windows"))));
  const naSpec = tabelaDaSpec();

  const soNoCodigo = [...noCodigo].filter((combo) => !naSpec.has(combo)).sort();
  const soNaSpec = [...naSpec].filter((combo) => !noCodigo.has(combo)).sort();

  assert.deepEqual(soNoCodigo, [], "atalho no código que a §9.2 não registra");
  assert.deepEqual(soNaSpec, [], "linha da §9.2 que o código não implementa mais");
});
