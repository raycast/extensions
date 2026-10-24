/**
 * Medição de custo de render de uma conversa longa. NÃO é teste — não roda no `node --test`
 * (a extensão é `.mts`, e o glob da suíte é `tests/**\/*.test.ts`). Rodar com:
 *
 *   node tests/bench-conversa.mts
 */
import { performance } from "node:perf_hooks";
import "./helpers/module-hooks.mjs";

const { pairMessagesIntoTurns, isTurnFinished } = await import("../src/lib/turns.ts");
const { createTurnDerivationCache } = await import("../src/lib/turn-derivations.ts");

const RENDER_TURN_LIMIT = 40;
const TOTAL_MESSAGES = 330;

const PROSA =
  "O Hermes analisou o pedido e organizou a resposta em partes. " +
  "Cada parte cobre um aspecto do que foi perguntado, com exemplos quando ajuda. ".repeat(6);

/** 330 mensagens em trocas de (user, assistant, tool), com algumas ferramentas enormes. */
function conversa(total: number): unknown[] {
  const messages: unknown[] = [];
  let id = 1;
  while (messages.length < total) {
    const n = messages.length;
    messages.push({
      id: id++,
      session_id: "s",
      role: "user",
      content: `Pergunta ${n} sobre o projeto e o que fazer a seguir.`,
    });
    if (messages.length < total)
      messages.push({ id: id++, session_id: "s", role: "assistant", content: `${PROSA} (resposta ${n})` });
    if (messages.length < total)
      messages.push({
        id: id++,
        session_id: "s",
        role: "tool",
        tool_name: "shell",
        // Uma em cada quatro é bruta e enorme, como a saída real de uma ferramenta.
        content: n % 4 === 0 ? "linha de saida ".repeat(4000) : "saida curta da ferramenta",
      });
  }
  return messages.slice(0, total);
}

function medir(rotulo: string, repeticoes: number, fn: () => void): number {
  fn(); // aquece o JIT
  const inicio = performance.now();
  for (let i = 0; i < repeticoes; i++) fn();
  const total = performance.now() - inicio;
  const cada = total / repeticoes;
  console.log(`${rotulo.padEnd(52)} ${cada.toFixed(3).padStart(9)} ms  (n=${repeticoes})`);
  return cada;
}

const messages = conversa(TOTAL_MESSAGES) as never;
const turnos = pairMessagesIntoTurns(messages);
console.log(`${TOTAL_MESSAGES} mensagens → ${turnos.length} trocas; janela renderizada = ${RENDER_TURN_LIMIT}\n`);

medir("pairMessagesIntoTurns(330)", 200, () => {
  pairMessagesIntoTurns(messages);
});

let janela = turnos.slice(-RENDER_TURN_LIMIT);

medir("1ª pintura: derivar as 40 trocas (cache frio)", 100, () => {
  const cache = createTurnDerivationCache();
  for (const turno of janela) cache.get(turno, "resposta", false);
});

// O caminho do stream: o turno vivo troca de objeto a cada flush de 80 ms; os outros 39 não.
const cacheQuente = createTurnDerivationCache();
for (const turno of janela) cacheQuente.get(turno, "resposta", false);

/**
 * O turno vivo de verdade: a resposta cresce ate passar do corte de MAX_TURN_CHARS e as
 * etapas se acumulam, porque cada evento do stream faz `steps: [...turn.steps, linha]`.
 */
function flushes(rotulo: string, modo: "resposta" | "etapas", totalFlushes: number) {
  const cache = createTurnDerivationCache();
  for (const turno of janela) cache.get(turno, modo, false);

  let vivo: Record<string, unknown> = {
    ...janela[janela.length - 1],
    answer: "",
    steps: [] as string[],
    state: { kind: "live", status: "running" },
    revision: 0,
  };

  const inicio = performance.now();
  let bytes = 0;
  for (let i = 0; i < totalFlushes; i++) {
    vivo = {
      ...vivo,
      answer: `${vivo.answer as string}mais um pedaco de texto que chegou do modelo. `,
      // Uma etapa nova a cada 4 flushes, como um `tool_call` no meio da prosa.
      steps: i % 4 === 0 ? [...(vivo.steps as string[]), `🔧 Usando shell — comando ${i}`] : (vivo.steps as string[]),
      revision: i + 1,
    };
    for (const turno of janela.slice(0, -1)) {
      cache.get(turno, modo, false);
      isTurnFinished(turno); // `renderTurn` chama por item, fora do cache
    }
    isTurnFinished(vivo as never);
    bytes = cache.get(vivo as never, modo, false).markdown.length;
  }
  const total = performance.now() - inicio;
  const cada = total / totalFlushes;
  console.log(
    `${rotulo.padEnd(52)} ${cada.toFixed(3).padStart(9)} ms  ` +
      `(markdown final ${(bytes / 1024).toFixed(1)} KB, ${(vivo.steps as string[]).length} etapas)`,
  );
  return cada;
}

const porFlush = flushes("stream em `resposta`: 500 flushes", "resposta", 500);
const porFlushEtapas = flushes("stream em `etapas`: 500 flushes", "etapas", 500);

const semIdentidade = medir("mesmo flush SE a identidade nao fosse preservada", 200, () => {
  const cache = createTurnDerivationCache();
  for (const turno of janela) cache.get({ ...turno } as never, "resposta", false);
});

function pesoDaJanela(): number {
  return janela.reduce((soma, turno) => {
    const cache = createTurnDerivationCache();
    return soma + cache.get(turno, "resposta", false).markdown.length;
  }, 0);
}
const pesoJanela = pesoDaJanela();

console.log(`
Orcamento: o buffer de render e de 80 ms (RENDER_BUFFER_MS), ~12,5 flushes por segundo.
  custo de JS por flush, modo resposta ... ${porFlush.toFixed(3)} ms = ${((porFlush / 80) * 100).toFixed(2)}% do intervalo
  custo de JS por flush, modo etapas ..... ${porFlushEtapas.toFixed(3)} ms = ${((porFlushEtapas / 80) * 100).toFixed(2)}% do intervalo
  se a identidade se perdesse ............ ${semIdentidade.toFixed(3)} ms = ${((semIdentidade / 80) * 100).toFixed(2)}% do intervalo
  peso da janela de ${String(janela.length).padStart(3)} em markdown ....... ${(pesoJanela / 1024).toFixed(0)} KB`);

/*
 * `renderCap` NAO e um teto fixo: cresce +RENDER_TURN_LIMIT a cada "Carregar parte anterior"
 * (use-conversation.ts:577). Quem abrir a conversa inteira renderiza as 110 trocas, e o
 * cache de derivacao tem limite de 128 entradas. Vale medir o pior caso que o desenho permite.
 */
console.log("");
console.log("Janela crescida pelo `Carregar parte anterior` (renderCap += 40 por vez):");
console.log("");
for (const tamanho of [80, 110]) {
  janela = turnos.slice(-Math.min(tamanho, turnos.length));
  const custo = flushes(`stream com janela de ${janela.length} trocas`, "resposta", 300);
  console.log(
    `${"".padEnd(52)} ${((custo / 80) * 100).toFixed(2)}% do intervalo de 80 ms, ` +
      `janela = ${(pesoDaJanela() / 1024).toFixed(0)} KB de markdown`,
  );
}

/*
 * O degrau do cache: `createTurnDerivationCache` guarda 128 entradas, e `renderCap` cresce
 * +40 por "Carregar parte anterior" (40 → 80 → 120 → 160). Passando de 128 trocas na janela,
 * cada render evita a entrada que acabou de usar e TODAS recalculam. Mede-se o degrau aqui
 * para que ele seja um numero, e nao uma suspeita.
 */
function degrauDoCache(): void {
  const muitas: unknown[] = [];
  let proximoId = 1;
  for (let t = 0; t < 220; t++) {
    muitas.push({ id: proximoId++, session_id: "s", role: "user", content: `Pergunta ${t}` });
    muitas.push({
      id: proximoId++,
      session_id: "s",
      role: "assistant",
      content: "resposta com alguma prosa. ".repeat(40),
    });
  }
  const todas = pairMessagesIntoTurns(muitas as never);
  console.log("");
  console.log(`Degrau do cache de derivacao (limite de 128 entradas), com ${todas.length} trocas:`);
  console.log("");
  for (const tamanho of [120, 128, 130, 160, 200]) {
    const recorte = todas.slice(-tamanho);
    const cache = createTurnDerivationCache();
    for (const t of recorte) cache.get(t, "resposta", false);
    for (const t of recorte) cache.get(t, "resposta", false);
    const inicio = performance.now();
    const N = 200;
    for (let i = 0; i < N; i++) for (const t of recorte) cache.get(t, "resposta", false);
    const cada = (performance.now() - inicio) / N;
    console.log(
      `  janela ${String(tamanho).padStart(3)} trocas -> ${cada.toFixed(3).padStart(8)} ms por render ` +
        `(${((cada / 80) * 100).toFixed(2)}% do intervalo de 80 ms)`,
    );
  }
  console.log("");
  console.log("  O salto e real, mas nao atravessa a ponte: `markdown` e string, e o React");
  console.log("  compara props por valor. Recalcular gera texto identico, nada e reenviado.");
}

degrauDoCache();
