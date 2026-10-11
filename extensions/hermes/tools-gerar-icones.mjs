// Gera os ícones de comando da extensão Hermes para Raycast.
//
// Padrão visual herdado do Hermes (apps/desktop/DESIGN.md):
//  - ladrilho branco de cantos arredondados: o "único literal sancionado" do
//    BrandMark, porque a marca precisa de um fundo fixo, igual no claro e no escuro;
//  - glifo do @tabler/icons, que é a biblioteca de ícones do Hermes Desktop;
//  - tinta na primária do Hermes, #0053fd (styles.css :root --theme-primary).
import { Resvg } from "@resvg/resvg-js";
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const AQUI = dirname(fileURLToPath(import.meta.url));
const TABLER = join(AQUI, "node_modules/@tabler/icons/icons/outline");

const LADRILHO = "#ffffff";
const TINTA = "#0053fd"; // --theme-primary do Hermes
const LADO = 512;
const RAIO = 112; // 21,9% — mesma proporção do ícone do Hermes Desktop
const CAIXA = 312; // quadrado ótico do glifo
const TRACO = 2.0; // stroke-width do tabler, em unidades de 24

const ICONES = [
  ["ask-hermes", "message-question"],
  ["sessions", "messages"],
  ["run-task", "player-play"],
  ["active-runs", "activity"],
  ["models", "cpu"],
  ["check-connection", "network"],
  ["configure-hermes", "settings"],
  ["ask-selection", "highlight"],
  ["summarize-clipboard", "clipboard-text"],
  ["skills", "brain"],
  ["toolsets", "tool"],
  ["fix-clipboard", "text-spellcheck"],
  ["translate-clipboard", "language"],
  ["paste-answer", "clipboard-check"],
  ["jobs", "clock-play"],
];

/** Extrai só os `d=` do tabler, descartando o path de moldura `M0 0h24v24H0z`. */
function tracos(nome) {
  const bruto = readFileSync(join(TABLER, `${nome}.svg`), "utf8");
  const ds = [...bruto.matchAll(/\sd="([^"]+)"/g)].map((m) => m[1]);
  const uteis = ds.filter((d) => !/^M0 0h24v24H0z$/.test(d.trim()));
  if (uteis.length === 0) throw new Error(`glifo sem traçado: ${nome}`);
  return uteis;
}

function svg(nome) {
  const escala = CAIXA / 24;
  const deslocamento = (LADO - CAIXA) / 2;
  const paths = tracos(nome)
    .map((d) => `    <path d="${d}" />`)
    .join("\n");
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${LADO}" height="${LADO}" viewBox="0 0 ${LADO} ${LADO}">
  <rect width="${LADO}" height="${LADO}" rx="${RAIO}" ry="${RAIO}" fill="${LADRILHO}" />
  <g transform="translate(${deslocamento} ${deslocamento}) scale(${escala})"
     fill="none" stroke="${TINTA}" stroke-width="${TRACO}"
     stroke-linecap="round" stroke-linejoin="round">
${paths}
  </g>
</svg>`;
}
const saida = process.argv[2] ?? join(AQUI, "out");
mkdirSync(saida, { recursive: true });

for (const [comando, glifo] of ICONES) {
  const fonte = svg(glifo);
  const png = new Resvg(fonte, { fitTo: { mode: "width", value: LADO } }).render().asPng();
  writeFileSync(join(saida, `cmd-${comando}.png`), png);
  console.log(`cmd-${comando}.png  <-  tabler/${glifo}`);
}
console.log(`\n${ICONES.length} ícones em ${saida}`);
