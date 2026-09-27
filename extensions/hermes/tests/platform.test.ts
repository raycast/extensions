/**
 * Testes de `platform.ts` e dos padrões que dependem do sistema.
 *
 * A extensão é declarada para macOS e Windows (`"platforms": ["macOS", "Windows"]`) e roda
 * a mesma base de código nos dois. O que muda é pequeno, e é justamente o que se quebra em
 * silêncio: um usuário de Mac lendo "abra no Bloco de Notas", ou um usuário de Windows
 * tendo o escopo de memória trocado por baixo dos panos numa atualização.
 *
 * Por isso **nada aqui lê `process.platform`**: toda função recebe a plataforma, e a suíte
 * cobre as duas rodando em qualquer máquina.
 *
 * Executar: `node --test tests/platform.test.ts`
 */

import test from "node:test";
import assert from "node:assert/strict";

import "./helpers/module-hooks.mjs";

const { platformCopy, toUiPlatform } = await import("../src/lib/platform.ts");
const { defaultSessionKey } = await import("../src/lib/preferences.ts");
const { approvalActionHint } = await import("../src/lib/approval-copy.ts");

/* ═══════════════════════ Identificação da plataforma ═══════════════════════ */

test("só `darwin` é macOS; o resto cai no comportamento Windows", () => {
  assert.equal(toUiPlatform("darwin"), "macos");
  assert.equal(toUiPlatform("win32"), "windows");
  // O Raycast não existe em Linux; o importante é NÃO virar macOS por acidente.
  assert.equal(toUiPlatform("linux"), "windows");
});

/* ══════════════════════════ Textos de cada sistema ═════════════════════════ */

test("o texto do macOS nunca nomeia programa do Windows, e vice-versa", () => {
  const mac = platformCopy("macos");
  const windows = platformCopy("windows");

  const macTexto = Object.values(mac).join("\n");
  const windowsTexto = Object.values(windows).join("\n");

  for (const proibido of ["Notepad", "File Explorer", "Ctrl"]) {
    assert.ok(!macTexto.includes(proibido), `o texto do macOS não pode citar "${proibido}": ${macTexto}`);
  }
  for (const proibido of ["TextEdit", "Finder", "Cmd"]) {
    assert.ok(!windowsTexto.includes(proibido), `o texto do Windows não pode citar "${proibido}": ${windowsTexto}`);
  }
});

test("as teclas nomeadas seguem o modificador de cada sistema", () => {
  const mac = platformCopy("macos");
  assert.equal(mac.copyKeys, "Cmd+C");
  assert.equal(mac.findKeys, "Cmd+F");
  assert.equal(mac.actionsKeys, "Cmd+K");
  assert.equal(mac.submitKeys, "Cmd+Enter");
  assert.equal(mac.fileManager, "Finder");
  assert.equal(mac.plainTextEditor, "TextEdit");

  const windows = platformCopy("windows");
  assert.equal(windows.copyKeys, "Ctrl+C");
  assert.equal(windows.findKeys, "Ctrl+F");
  assert.equal(windows.actionsKeys, "Ctrl+K");
  assert.equal(windows.submitKeys, "Ctrl+Enter");
  assert.equal(windows.fileManager, "File Explorer");
  assert.equal(windows.plainTextEditor, "Notepad");
});

test("a dica de arquivos ocultos ensina o caminho do sistema certo", () => {
  assert.match(platformCopy("windows").showHiddenFilesHint, /Hidden items/);
  assert.match(platformCopy("macos").showHiddenFilesHint, /Cmd\+Shift\+\./);
});

test("a dica de aprovação aponta o painel de ações com a tecla de cada sistema", () => {
  assert.match(approvalActionHint(platformCopy("windows")), /Actions \(Ctrl\+K\)/);
  assert.match(approvalActionHint(platformCopy("macos")), /Actions \(Cmd\+K\)/);
});

/* ════════════════════════ Escopo de memória (sessionKey) ═══════════════════ */

test("o escopo de memória do Windows continua sendo o de sempre", () => {
  // REGRESSÃO: mudar este literal troca o escopo de memória de longo prazo de quem já
  // usa a extensão no Windows. A memória antiga não é apagada, mas fica órfã.
  assert.equal(defaultSessionKey("windows"), "raycast:windows:default");
});

test("o macOS ganha um escopo próprio, sem tocar no do Windows", () => {
  assert.equal(defaultSessionKey("macos"), "raycast:macos:default");
  assert.notEqual(defaultSessionKey("macos"), defaultSessionKey("windows"));
});
