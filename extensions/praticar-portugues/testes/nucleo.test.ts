/**
 * Bateria do núcleo. Roda fora do Raycast, sem framework:  npm test
 *
 * Só toca os módulos puros — texto, apresentação, agenda, métricas e o léxico.
 * O que depende de LocalStorage e de React fica de fora de propósito: mock de
 * storage testa o mock, não o produto.
 */
import assert from "node:assert/strict";
import {
  MARCA_INVISIVEL,
  aceitar,
  estadoDoPedaco,
  fatiar,
  limparMarca,
  realcarNoExemplo,
  semAcento,
} from "../src/nucleo/texto";
import { barraDeProgresso, linhaComCursor, markdownDaDigitacao } from "../src/nucleo/apresentacao";
import { alvoDaEtapa } from "../src/nucleo/sessao";
import { embaralhar, estaDevida, marcarPulada, montarFila, promover } from "../src/nucleo/agenda";
import { Cronometro, agregar, atualizarRecordes, calcularPpm, calcularPrecisao, porDia } from "../src/nucleo/metricas";
import { ETAPAS_DO_MODO, registroVazio } from "../src/nucleo/tipos";
import type { Progresso, Sessao, Verbete } from "../src/nucleo/tipos";
import lexico from "../src/dados/lexico.json";

const ESTRITO = { exigirAcento: true, exigirCaixa: true };
const FROUXO = { exigirAcento: false, exigirCaixa: false };
const PADRAO = { exigirAcento: true, exigirCaixa: false };

let n = 0;
let falhas = 0;
function teste(nome: string, corpo: () => void) {
  n++;
  try {
    corpo();
    console.log(`  ${String(n).padStart(2, " ")}. ok    ${nome}`);
  } catch (erro) {
    falhas++;
    console.log(`  ${String(n).padStart(2, " ")}. FALHA ${nome}`);
    console.log(`      ${erro instanceof Error ? erro.message.split("\n")[0] : String(erro)}`);
  }
}

console.log("\nBateria do núcleo — Praticar Português\n");

// ---------- bloqueio: o coração da mecânica ----------

teste("campo vazio: cursor na posição zero, nada aceito", () => {
  const r = aceitar("efêmero", "", PADRAO);
  assert.equal(r.posicao, 0);
  assert.equal(r.aceito, "");
  assert.equal(r.completo, false);
  assert.equal(r.esperado, "e");
});

teste("prefixo certo avança o cursor e nada é recusado", () => {
  const r = aceitar("efêmero", "efê", PADRAO);
  assert.equal(r.posicao, 3);
  assert.equal(r.aceito, "efê");
  assert.equal(r.recusado, undefined);
  assert.equal(r.esperado, "m");
});

teste("tecla errada é RECUSADA: não entra no texto e o cursor não anda", () => {
  const r = aceitar("efêmero", "efx", PADRAO);
  assert.equal(r.aceito, "ef", "o caractere errado vazou para o texto aceito");
  assert.equal(r.posicao, 2, "o cursor andou apesar do erro");
  assert.equal(r.recusado, "x");
  assert.equal(r.esperado, "ê");
});

teste("nada passa depois de uma recusa, mesmo que o resto esteja certo", () => {
  const r = aceitar("efêmero", "efxmero", PADRAO);
  assert.equal(r.aceito, "ef");
  assert.equal(r.posicao, 2);
  assert.equal(r.completo, false);
});

teste("caractere além do fim também é recusado", () => {
  const r = aceitar("efêmero", "efêmeros", PADRAO);
  assert.equal(r.posicao, 7);
  assert.equal(r.completo, true);
  assert.equal(r.recusado, "s");
  assert.equal(r.esperado, undefined);
});

teste("apagar é sempre permitido", () => {
  const r = aceitar("efêmero", "ef", PADRAO);
  assert.equal(r.aceito, "ef");
  assert.equal(r.recusado, undefined);
});

teste("palavra exata conclui a etapa", () => {
  assert.equal(aceitar("efêmero", "efêmero", PADRAO).completo, true);
});

teste("a marca invisível nunca conta como caractere digitado", () => {
  const r = aceitar("efêmero", "efê" + MARCA_INVISIVEL, PADRAO);
  assert.equal(r.posicao, 3);
  assert.equal(r.recusado, undefined);
  assert.equal(limparMarca("ef" + MARCA_INVISIVEL + "ê"), "efê");
});

// ---------- acento, cedilha e caixa ----------

teste("acento exigido: e simples é recusado no lugar de ê", () => {
  const r = aceitar("efêmero", "efe", ESTRITO);
  assert.equal(r.recusado, "e");
  assert.equal(r.posicao, 2);
});

teste("acento dispensado: efemero conclui efêmero", () => {
  assert.equal(aceitar("efêmero", "efemero", FROUXO).completo, true);
});

teste("cedilha dispensada: excecao conclui exceção", () => {
  assert.equal(aceitar("exceção", "excecao", FROUXO).completo, true);
  assert.equal(aceitar("exceção", "excecao", ESTRITO).completo, false);
});

teste("caixa dispensada por padrão: Efêmero conclui efêmero", () => {
  assert.equal(aceitar("efêmero", "Efêmero", PADRAO).completo, true);
  assert.equal(aceitar("efêmero", "Efêmero", ESTRITO).completo, false);
});

teste("tirar acento não desalinha os índices", () => {
  const r = aceitar("coerência", "coerencia", FROUXO);
  assert.equal(r.posicao, 9);
  assert.equal(r.completo, true);
});

teste("todo verbete tem o mesmo comprimento com e sem acento", () => {
  for (const v of lexico.palavras) {
    assert.equal(Array.from(semAcento(v.palavra)).length, Array.from(v.palavra).length, `desalinhou em "${v.palavra}"`);
  }
});

// ---------- régua de aprovação ----------

teste("palavra vira um pedaço por letra", () => {
  assert.deepEqual(
    fatiar("cerne").map((p) => p.texto),
    ["c", "e", "r", "n", "e"],
  );
});

teste("frase vira um pedaço por palavra, sem etiqueta de espaço", () => {
  const p = fatiar("A fama viral é efêmera: some antes de virar memória.");
  assert.equal(p.length, 10);
  assert.ok(p.every((x) => !x.texto.includes(" ")));
});

teste("frase curta também vai por palavra: quem manda é o espaço, não o tamanho", () => {
  assert.deepEqual(
    fatiar("O cerne do problema").map((p) => p.texto),
    ["O", "cerne", "do", "problema"],
  );
});

teste("o pedaço sob o cursor fica laranja, e vermelho quando a tecla é recusada", () => {
  const p = fatiar("O cerne do problema");
  assert.equal(estadoDoPedaco(p[0]!, 2, false), "certo");
  assert.equal(estadoDoPedaco(p[1]!, 2, false), "atual");
  assert.equal(estadoDoPedaco(p[1]!, 2, true), "errado");
  assert.equal(estadoDoPedaco(p[3]!, 2, false), "pendente");
});

// ---------- a linha grande com cursor ----------

teste("o cursor separa o que passou do que falta", () => {
  assert.equal(linhaComCursor("efêmero", 3), "efê▍mero");
  assert.equal(linhaComCursor("efêmero", 0), "▍efêmero");
  assert.equal(linhaComCursor("efêmero", 7), "efêmero▍");
});

teste("marcação do Markdown dentro do alvo é neutralizada", () => {
  assert.equal(linhaComCursor("a*b", 1), "a▍\\*b");
});

teste("a barra de progresso enche na proporção certa", () => {
  assert.equal(barraDeProgresso(0, 10, 10), "░░░░░░░░░░");
  assert.equal(barraDeProgresso(5, 10, 10), "█████░░░░░");
  assert.equal(barraDeProgresso(10, 10, 10), "██████████");
  assert.equal(barraDeProgresso(0, 0, 4), "░░░░");
});

// ---------- as três etapas ----------

const verbeteExemplo: Verbete = {
  palavra: "efêmero",
  classe: "adjetivo",
  significado: "que dura muito pouco tempo",
  exemplo: "A fama viral é efêmera: some antes de virar memória.",
  nivel: 1,
};

teste("cada etapa aponta para o campo certo do verbete", () => {
  assert.equal(alvoDaEtapa(verbeteExemplo, "palavra"), "efêmero");
  assert.equal(alvoDaEtapa(verbeteExemplo, "significado"), "que dura muito pouco tempo");
  assert.equal(alvoDaEtapa(verbeteExemplo, "exemplo"), verbeteExemplo.exemplo);
});

teste("o modo completo tem três etapas, nesta ordem", () => {
  assert.deepEqual(ETAPAS_DO_MODO.completo, ["palavra", "significado", "exemplo"]);
  assert.deepEqual(ETAPAS_DO_MODO["palavra-significado"], ["palavra", "significado"]);
  assert.deepEqual(ETAPAS_DO_MODO.palavra, ["palavra"]);
});

teste("na etapa 1 o significado ainda não é revelado", () => {
  const md = markdownDaDigitacao({
    verbete: verbeteExemplo,
    etapa: "palavra",
    etapasDoModo: ETAPAS_DO_MODO.completo,
    alvo: "efêmero",
    posicao: 3,
    palavraNumero: 1,
    totalPalavras: 10,
  });
  assert.ok(md.includes("# efê▍mero"), "faltou a linha grande com cursor");
  assert.ok(!md.includes("que dura muito pouco tempo"), "o significado vazou na etapa 1");
  assert.ok(md.includes("ETAPA 1 DE 3"));
});

teste("na etapa 3 a palavra e o significado já aparecem como contexto", () => {
  const md = markdownDaDigitacao({
    verbete: verbeteExemplo,
    etapa: "exemplo",
    etapasDoModo: ETAPAS_DO_MODO.completo,
    alvo: verbeteExemplo.exemplo,
    posicao: 0,
    palavraNumero: 4,
    totalPalavras: 10,
  });
  assert.ok(md.includes("## efêmero"));
  assert.ok(md.includes("Que dura muito pouco tempo"));
  assert.ok(md.includes("PALAVRA 4 DE 10"));
  assert.ok(md.includes("ETAPA 3 DE 3"));
});

teste("o exemplo destaca a palavra mesmo flexionada", () => {
  assert.ok(realcarNoExemplo("A fama viral é efêmera: some.", "efêmero").includes("**efêmera**"));
  assert.ok(realcarNoExemplo("Os testes corroboraram a hipótese.", "corroborar").includes("**corroboraram**"));
});

// ---------- Leitner ----------

teste("terminar sem recusa sobe uma caixa", () => {
  const r = promover(registroVazio(), 0, 1_000);
  assert.equal(r.caixa, 1);
  assert.equal(promover(r, 0, 1_000).caixa, 2);
});

teste("uma ou duas recusas mantêm a caixa; três derrubam para a 1", () => {
  const base = { ...registroVazio(), caixa: 3 };
  assert.equal(promover(base, 1, 1_000).caixa, 3);
  assert.equal(promover(base, 2, 1_000).caixa, 3);
  assert.equal(promover({ ...registroVazio(), caixa: 5 }, 3, 1_000).caixa, 1);
});

teste("a caixa nunca passa de 5", () => {
  assert.equal(promover({ ...registroVazio(), caixa: 5 }, 0, 1_000).caixa, 5);
});

teste("pular não promove nem deixa a palavra dormir muito", () => {
  const r = marcarPulada({ ...registroVazio(), caixa: 4 }, 1_000);
  assert.ok(r.caixa <= 2);
  assert.ok(r.devidaEm - 1_000 <= 20 * 60_000);
});

teste("palavra vencida é devida; palavra nova não é", () => {
  const agora = 10_000_000;
  assert.equal(estaDevida({ ...registroVazio(), caixa: 2, devidaEm: agora - 1 }, agora), true);
  assert.equal(estaDevida({ ...registroVazio(), caixa: 2, devidaEm: agora + 1 }, agora), false);
  assert.equal(estaDevida(registroVazio(), agora), false);
});

// ---------- montagem da fila ----------

const verbetes: Verbete[] = lexico.palavras.map((v) => ({ ...v, nivel: v.nivel as 1 | 2 | 3 }));

teste("a fila tem o tamanho pedido e nunca repete palavra", () => {
  const fila = montarFila(verbetes, {}, { quantidade: 10, revisaoEspacada: true, agora: Date.now() });
  assert.equal(fila.length, 10);
  assert.equal(new Set(fila.map((v) => v.palavra)).size, 10);
});

teste("revisão não passa de 60% da sessão", () => {
  const agora = Date.now();
  const progresso: Progresso = {};
  for (const v of verbetes.slice(0, 100)) {
    progresso[v.palavra] = { ...registroVazio(), caixa: 2, devidaEm: agora - 1_000, tentativas: 1 };
  }
  const fila = montarFila(verbetes, progresso, { quantidade: 10, revisaoEspacada: true, agora });
  const deRevisao = fila.filter((v) => progresso[v.palavra] !== undefined).length;
  assert.ok(deRevisao <= 6, `revisão ocupou ${deRevisao} de 10`);
  assert.ok(deRevisao >= 1, "nenhuma revisão entrou mesmo com 100 vencidas");
});

teste("sem revisão espaçada a fila é sorteio puro", () => {
  const a = montarFila(verbetes, {}, { quantidade: 30, revisaoEspacada: false, agora: Date.now() });
  const b = montarFila(verbetes, {}, { quantidade: 30, revisaoEspacada: false, agora: Date.now() });
  assert.notDeepEqual(
    a.map((v) => v.palavra),
    b.map((v) => v.palavra),
  );
});

teste("embaralhar preserva todos os elementos", () => {
  const origem = [1, 2, 3, 4, 5, 6, 7, 8];
  assert.deepEqual([...embaralhar(origem)].sort((x, y) => x - y), origem);
  assert.deepEqual(origem, [1, 2, 3, 4, 5, 6, 7, 8]);
});

// ---------- métricas ----------

teste("PPM segue o padrão de cinco caracteres por palavra", () => {
  assert.equal(Math.round(calcularPpm(5, 60)), 1);
  assert.equal(Math.round(calcularPpm(200, 60)), 40);
  assert.equal(calcularPpm(100, 0), 0);
});

teste("precisão conta tecla recusada", () => {
  assert.equal(calcularPrecisao(9, 1), 0.9);
  assert.equal(calcularPrecisao(10, 0), 1);
  assert.equal(calcularPrecisao(0, 0), 1);
});

teste("pausa acima de oito segundos não entra no cronômetro", () => {
  const c = new Cronometro();
  c.tocar(0);
  c.tocar(1_000);
  c.tocar(60_000);
  c.tocar(61_000);
  assert.equal(c.segundos(), 1 + 8 + 1);
});

teste("média geral é ponderada pelo volume, não pela contagem de sessões", () => {
  const sessoes: Sessao[] = [
    { em: 1, palavras: 1, caracteres: 5, deslizes: 0, ppm: 300, precisao: 1, segundos: 1 },
    { em: 2, palavras: 50, caracteres: 500, deslizes: 0, ppm: 50, precisao: 1, segundos: 120 },
  ];
  const a = agregar(sessoes);
  assert.ok(a.ppmMedio < 60, `ppm ponderado deu ${a.ppmMedio}`);
  assert.equal(a.caracteres, 505);
});

teste("sequência de dias sobe no dia seguinte e zera com buraco", () => {
  const dia = 86_400_000;
  const base = Date.parse("2026-08-05T10:00:00");
  const sessao = (em: number): Sessao => ({
    em,
    palavras: 5,
    caracteres: 50,
    deslizes: 0,
    ppm: 40,
    precisao: 1,
    segundos: 30,
  });

  let r = atualizarRecordes(
    { melhorPpm: 0, melhorPrecisao: 0, sequenciaDias: 0, melhorSequenciaDias: 0, ultimoDia: "" },
    sessao(base),
  );
  assert.equal(r.sequenciaDias, 1);
  r = atualizarRecordes(r, sessao(base + dia));
  assert.equal(r.sequenciaDias, 2);
  r = atualizarRecordes(r, sessao(base + dia + 3_600_000));
  assert.equal(r.sequenciaDias, 2);
  r = atualizarRecordes(r, sessao(base + 5 * dia));
  assert.equal(r.sequenciaDias, 1);
  assert.equal(r.melhorSequenciaDias, 2);
});

teste("porDia devolve sempre sete dias, mesmo sem sessão", () => {
  const semana = porDia([], 7, Date.now());
  assert.equal(semana.length, 7);
  assert.ok(semana.every((d) => d.palavras === 0));
});

// ---------- léxico ----------

teste("o léxico tem 283 verbetes, sem duplicata", () => {
  assert.equal(lexico.palavras.length, 283);
  assert.equal(new Set(lexico.palavras.map((v) => v.palavra)).size, 283);
});

teste("todo verbete tem os cinco campos preenchidos", () => {
  for (const v of lexico.palavras) {
    for (const campo of ["palavra", "classe", "significado", "exemplo"] as const) {
      assert.ok(typeof v[campo] === "string" && v[campo].trim().length > 0, `${v.palavra}: ${campo}`);
    }
    assert.ok([1, 2, 3].includes(v.nivel), `${v.palavra}: nível ${v.nivel}`);
  }
});

teste("nenhum verbete quebra a linha grande com marcação de Markdown", () => {
  for (const v of lexico.palavras) {
    for (const campo of [v.palavra, v.significado, v.exemplo]) {
      assert.ok(!/[*_`[\]~|]/.test(campo), `"${v.palavra}" tem marcação em: ${campo}`);
    }
  }
});

console.log(`\n${n - falhas}/${n} testes passaram${falhas ? ` — ${falhas} FALHARAM` : ""}.\n`);
process.exit(falhas > 0 ? 1 : 0);
