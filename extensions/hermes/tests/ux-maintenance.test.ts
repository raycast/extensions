import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

import "./helpers/module-hooks.mjs";

const { compactConversationCount, compactMessageCount, compactModelLabel, conversationDropdownLabel, truncateOneLine } =
  await import("../src/lib/ui-text.ts");
const { approvalActionHint, approvalDetailsLostHint } = await import("../src/lib/approval-copy.ts");

const root = fileURLToPath(new URL("..", import.meta.url));
const packageJson = JSON.parse(readFileSync(`${root}/package.json`, "utf8")) as {
  platforms?: string[];
  preferences: Array<{ name: string; default?: unknown; description?: string }>;
  commands: Array<{ name: string; title: string; description?: string; keywords?: string[] }>;
};
/**
 * Lê um arquivo do projeto com as quebras de linha normalizadas. O `.gitattributes` grava
 * LF no repositório, mas um checkout antigo no Windows pode ter CRLF em disco, e um `\r`
 * perdido faria estes testes de contrato falharem por um motivo que não é o deles.
 */
function source(relativePath: string): string {
  return readFileSync(`${root}/${relativePath}`, "utf8").replace(/\r\n/g, "\n");
}

const shortcutsSource = source("src/components/shortcuts.ts");
const commonSource = source("src/components/common.tsx");
const approvalSource = source("src/components/approval-view.tsx");
const activeRunsSource = source("src/active-runs.tsx");
const sessionsSource = source("src/sessions.tsx");
const firstRunSource = source("src/components/first-run.tsx");
const askSelectionSource = source("src/ask-selection.tsx");
const clipboardSources = ["fix-clipboard", "summarize-clipboard", "translate-clipboard"].map(
  (name) => [name, source(`src/${name}.tsx`)] as const,
);

function command(name: string) {
  const found = packageJson.commands.find((item) => item.name === name);
  assert.ok(found, `comando ${name} precisa continuar registrado`);
  return found;
}

test("texto de lista vira uma linha e não separa emoji ao truncar", () => {
  assert.equal(truncateOneLine("  título\ncom\tquebra  ", 12), "título com…");

  const shown = truncateOneLine("🌱 irrigação muito longa", 10);
  assert.equal(shown, "🌱 irriga…");
  assert.equal(/\uD800|\uDFFF/.test(shown), false);

  const developer = truncateOneLine("👩‍💻 desenvolve no Hermes", 4);
  assert.equal(developer.startsWith("👩‍💻"), true);
  assert.equal(developer.startsWith("👩‍…"), false);
});

test("contadores e rótulos do seletor ficam compactos sem perder a data", () => {
  assert.equal(compactMessageCount(1), "1 msg");
  assert.equal(compactMessageCount(12), "12 msgs");
  assert.equal(compactMessageCount(0), "0 msgs");
  assert.equal(compactConversationCount(1), "1 conversation");
  assert.equal(compactConversationCount(12), "12 conversations");

  const label = conversationDropdownLabel("Uma conversa com um título muito, muito comprido", "2 h ago");
  assert.equal(label.endsWith(" · 2 h ago"), true);
  assert.equal(Array.from(label).length <= 56, true);
});

test("modelo da linha usa rótulo compacto sem perder o valor completo no tooltip", () => {
  const model = "anthropic/claude-sonnet-4-20250514";
  assert.equal(compactModelLabel(model), "anthropic/claude-sonnet…");
  assert.equal(compactModelLabel("gpt-5"), "gpt-5");
});

/**
 * Todos os `perPlatform(Windows, macOS)` da tabela de atalhos, já separados. Casa também
 * quando o Prettier quebra a chamada em várias linhas.
 */
const PER_PLATFORM =
  /(\w+): perPlatform\(\s*\{ modifiers: \[([^\]]*)\], key: "([^"]+)" \},\s*\{ modifiers: \[([^\]]*)\], key: "([^"]+)" \},?\s*\)/g;

function parsedShortcuts() {
  return [...shortcutsSource.matchAll(PER_PLATFORM)].map((match) => ({
    name: match[1],
    windowsModifiers: match[2].split(",").map((item) => item.trim().replace(/"/g, "")),
    windowsKey: match[3],
    macModifiers: match[4].split(",").map((item) => item.trim().replace(/"/g, "")),
    macKey: match[5],
  }));
}

test("atalhos Windows mantêm Nova conversa em Ctrl+N e etapas em Ctrl+T", () => {
  assert.match(shortcutsSource, /newConversation:\s*Keyboard\.Shortcut\.Common\.New/);
  assert.match(
    shortcutsSource,
    /toggleSteps: perPlatform\(\{ modifiers: \["ctrl"\], key: "t" \}, \{ modifiers: \["cmd"\], key: "t" \}\)/,
  );
  assert.doesNotMatch(shortcutsSource, /newConversation:\s*\{[^}]*key:\s*["']t["']/s);
});

test("cada atalho customizado declara os dois sistemas, com a mesma tecla", () => {
  const shortcuts = parsedShortcuts();
  // Guarda contra uma regex que pare de casar e faça os testes abaixo virarem no-op.
  assert.ok(shortcuts.length >= 15, `esperava a tabela inteira, li ${shortcuts.length} atalhos`);

  for (const shortcut of shortcuts) {
    assert.equal(
      shortcut.windowsKey,
      shortcut.macKey,
      `${shortcut.name}: a tecla muda entre os sistemas; o que muda deve ser só o modificador`,
    );
  }
});

test("o bloco Windows nunca usa cmd/opt e o bloco macOS nunca usa alt/windows", () => {
  for (const shortcut of parsedShortcuts()) {
    for (const modifier of shortcut.windowsModifiers) {
      // No Windows um atalho com `cmd` é silenciosamente ignorado (pesquisa 07 §8.1).
      assert.ok(
        ["ctrl", "shift", "alt"].includes(modifier),
        `${shortcut.name}: "${modifier}" não é modificador de Windows`,
      );
    }
    for (const modifier of shortcut.macModifiers) {
      assert.ok(
        ["cmd", "ctrl", "opt", "shift"].includes(modifier),
        `${shortcut.name}: "${modifier}" não é modificador de macOS`,
      );
    }
  }
});

test("a lista de conversas fixa, e não tem execução para parar", () => {
  // Este teste já foi outra coisa: guardava uma colisão entre `stop` e `Common.Pin` no
  // macOS que não existe — `Common.Pin` é `Cmd+.`, não `Cmd+Shift+P`. Colisão de teclas
  // agora é assunto de `tests/shortcuts.test.ts`, que compara teclas de verdade em vez de
  // texto. O que sobra aqui é a afirmação de tela, que continua valendo por si: a lista de
  // conversas não executa nada, então `Parar` não tem o que fazer nela.
  assert.match(sessionsSource, /SHORTCUTS\.pin/);
  assert.doesNotMatch(sessionsSource, /SHORTCUTS\.stop/);
});

test("a repetição de uma execução deixa claro que é uma tarefa, não uma conversa", () => {
  assert.match(activeRunsSource, /title="Run This Task Again"/);
  assert.doesNotMatch(activeRunsSource, /title="Ask Again"/);
});

test("manifesto expõe comandos úteis por nomes e palavras que o usuário procura", () => {
  assert.equal(command("models").title, "Hermes Models");
  assert.match(command("models").description ?? "", /shortcuts.*Raycast settings/i);
  assert.deepEqual(
    ["choose model", "switch model"].every((word) => command("models").keywords?.includes(word)),
    true,
  );
  assert.deepEqual(
    ["pending", "pending tasks", "running tasks", "waiting for approval", "pending approval", "approvals"].every(
      (word) => command("active-runs").keywords?.includes(word),
    ),
    true,
  );
  assert.deepEqual(command("ask-hermes").keywords?.includes("new message"), true);
  assert.deepEqual(command("ask-hermes").keywords?.includes("continue conversation"), true);
  assert.deepEqual(command("run-task").keywords?.includes("new task"), true);
  assert.deepEqual(command("sessions").keywords?.includes("history"), true);
  assert.deepEqual(command("sessions").keywords?.includes("conversation history"), true);
  assert.deepEqual(command("paste-answer").keywords?.includes("reuse answer"), true);
  assert.deepEqual(command("paste-answer").keywords?.includes("copy last answer"), true);
});

test("Actions oferece um caminho explícito para o comando real de modelos", () => {
  assert.match(commonSource, /title="Choose Model"/);
  assert.match(commonSource, /name:\s*["']models["']/);
});

test("aprovação explica que as escolhas ficam em Actions e não inventa botões", () => {
  // A tecla é a do sistema (`tests/platform.test.ts` cobre as duas); aqui só importa que
  // a frase continue apontando o painel de ações.
  assert.match(approvalActionHint(), /Actions \((Ctrl|Cmd)\+K\)/);
  assert.match(approvalDetailsLostHint(), /details.*lost/i);
  assert.match(approvalDetailsLostHint(), /Deny/i);
});

test("aprovação sem detalhes mantém somente a saída segura e filtra choices próprias", () => {
  assert.doesNotMatch(approvalSource, /Approve Without Seeing the Details/i);
  assert.match(approvalSource, /Object\.hasOwn\(CHOICE_SPECS, c\)/);
});

/* ═══════════════ Uma base de código, dois sistemas (macOS + Windows) ═══════════════ */

test("o manifesto declara macOS e Windows", () => {
  assert.deepEqual([...(packageJson.platforms ?? [])].sort(), ["Windows", "macOS"]);
});

test("o manifesto não fixa um escopo de memória: quem resolve é o código, por sistema", () => {
  // Com `default` no manifesto, o Raycast injetaria o mesmo literal em toda instalação e
  // trocar o padrão migraria em silêncio quem nunca tocou no campo. Ver `preferences.ts`.
  const sessionKey = packageJson.preferences.find((item) => item.name === "sessionKey");
  assert.ok(sessionKey, "a preferência sessionKey precisa continuar existindo");
  assert.equal(sessionKey.default, undefined);
  assert.match(sessionKey.description ?? "", /raycast:windows:default/);
  assert.match(sessionKey.description ?? "", /raycast:macos:default/);
});

test("o passo a passo manual não nomeia programa do Windows em texto fixo", () => {
  // Só o CORPO de `manualMarkdown` — o cabeçalho do arquivo cita os nomes dos dois
  // sistemas de propósito, explicando por que eles não podem estar no texto de tela.
  const inicio = firstRunSource.indexOf("export function manualMarkdown(");
  assert.ok(inicio > 0, "manualMarkdown precisa continuar exportada para este teste");
  const corpo = firstRunSource.slice(inicio, firstRunSource.indexOf("\n}", inicio));

  // Só o texto fixo: as interpolações saem fora, senão o próprio nome da propriedade
  // (`copy.plainTextEditor`) seria lido como se fosse a palavra "TextEdit" na tela.
  const literais = corpo.replace(/\$\{[^}]*\}/g, "").replace(/copy\.\w+/g, "");

  // Os nomes saem de `platformCopy()`; um literal aqui voltaria a mandar o usuário de Mac
  // abrir o Bloco de Notas.
  for (const proibido of ["Notepad", "File Explorer", "TextEdit", "Finder", "Ctrl+", "Cmd+"]) {
    assert.ok(!literais.includes(proibido), `manualMarkdown não pode fixar "${proibido}" no texto de tela`);
  }
  assert.match(corpo, /copy\.plainTextEditor/);
  assert.match(corpo, /copy\.fileManager/);
  assert.match(corpo, /copy\.findKeys/);
  assert.match(corpo, /copy\.copyKeys/);
  assert.match(corpo, /copy\.showHiddenFilesHint/);
});

test("os estados vazios de texto não afirmam que a limitação é do Windows", () => {
  assert.doesNotMatch(askSelectionSource, /No Windows/);
  assert.match(askSelectionSource, /copy\.copyKeys/);

  for (const [name, source] of clipboardSources) {
    assert.match(source, /copyFirstHint\(\)/, `${name} deveria usar o estado vazio compartilhado`);
    assert.doesNotMatch(source, /emptyDescription="[^"]*Ctrl\+C/, `${name} não pode fixar Ctrl+C`);
  }
});
