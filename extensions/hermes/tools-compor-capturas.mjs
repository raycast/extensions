// Monta as seis capturas da Raycast Store a partir das imagens de origem.
//
// A Store não quer só 2000 × 1250: o CI do `raycast/extensions` mede a margem em volta da
// janela e exige de 8% a 17% de cada lado, simétrica. Ver `tools-validar-capturas.mjs`,
// que é o porte da regra e o portão local para conferir o resultado.
//
// Aqui a janela é recortada da origem e recolocada com 11,5% de margem em cima e embaixo;
// a lateral cai sozinha, pela proporção da janela, e ficou entre 12,3% e 13,5% nas seis —
// o miolo da faixa. O fundo é o próprio papel de parede, BORRADO: sem o borrão as bolhas
// coloridas geram gradientes fortes e o detector do validador as confunde com a janela.
// A borda branca de 3 px também não é enfeite — contra fundo borrado a borda real fica
// suave demais para o detector, e ele passa direto até uma divisória interna.
//
//   npm install --no-save @resvg/resvg-js
//   node tools-compor-capturas.mjs
//   node tools-validar-capturas.mjs metadata/*.png
import { Resvg } from "@resvg/resvg-js";
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { decodePng, janelaPorRetas } from "./tools-validar-capturas.mjs";

const LARGURA = 2000;
const ALTURA = 1250;
const MARGEM = 0.115;
const RAIO = 18;

// `remendos` cobre traço de seta que o Codex desenhou por fora e que entrou no recorte.
// `janelaFixa` existe para quando o detector morde a isca do rótulo em vez da janela.
const TELAS = [
  { origem: "_capturas-brutas/codex-1-ask-v2.png", destino: "metadata/hermes-1.png" },
  { origem: "_capturas-brutas/codex-2-conversations-v2.png", destino: "metadata/hermes-2.png" },
  {
    origem: "_capturas-brutas/codex-3-runtask.png",
    destino: "metadata/hermes-3.png",
    // Dois retângulos sobre fundo liso: o traço no cabeçalho e o lampejo entre o título e
    // a primeira etapa. A cor sai da própria imagem, linha a linha.
    remendos: [
      { x: 355, y: 136, w: 90, h: 176 },
      { x: 326, y: 377, w: 36, h: 36 },
    ],
  },
  {
    origem: "_capturas-brutas/codex-4-toolsets.png",
    destino: "metadata/hermes-4.png",
    // A calha à esquerda da lista tem 30 px: não há coluna limpa para amostrar por linha
    // (a 30 px cai no verde de "Available"), então aqui a cor vem de um ponto fixo.
    remendos: [{ x: 258, y: 269, w: 32, h: 38, amostra: [272, 360] }],
  },
  {
    origem: "_capturas-brutas/codex-5-models.png",
    destino: "metadata/hermes-5.png",
    // O rótulo do Codex encosta na quina e a borda RETA dele pontua mais que a da janela.
    // Sem fixar o recorte, sobra um pedaço de "cast" solto no canto.
    janelaFixa: { left: 268, top: 138, right: 1396, bottom: 869 },
  },
  { origem: "_capturas-brutas/codex-6-connection.png", destino: "metadata/hermes-6.png" },
];

function svgDaTela(tela) {
  const im = decodePng(tela.origem);
  const j = tela.janelaFixa ?? janelaPorRetas(im);
  const jw = j.right - j.left;
  const jh = j.bottom - j.top;

  // Margem vertical fixa por construção; a lateral sai da proporção da janela.
  const alvoH = Math.round(ALTURA * (1 - 2 * MARGEM));
  const escala = alvoH / jh;
  const alvoW = Math.round(jw * escala);
  const x0 = Math.round((LARGURA - alvoW) / 2);
  const y0 = Math.round((ALTURA - alvoH) / 2);

  // A origem inteira, escalada, posicionada para o recorte da janela cair em (x0, y0).
  const origW = im.w * escala;
  const origH = im.h * escala;
  const origX = x0 - j.left * escala;
  const origY = y0 - j.top * escala;

  const cobrir = Math.max(LARGURA / im.w, ALTURA / im.h) * 1.15;
  const fundoW = im.w * cobrir;
  const fundoH = im.h * cobrir;
  const fundoX = (LARGURA - fundoW) / 2;
  const fundoY = (ALTURA - fundoH) / 2;

  const dados = `data:image/png;base64,${readFileSync(tela.origem).toString("base64")}`;

  const corEm = (fx, fy) => {
    const sx = Math.min(Math.max(Math.round((fx - origX) / escala), 0), im.w - 1);
    const sy = Math.min(Math.max(Math.round((fy - origY) / escala), 0), im.h - 1);
    const i = (sy * im.w + sx) * 3;
    return `rgb(${im.rgb[i]},${im.rgb[i + 1]},${im.rgb[i + 2]})`;
  };
  // Uma tira de 1 px por linha, com a cor da própria linha. Cor chapada deixa faixa
  // visível: o painel tem gradiente vertical e divisórias horizontais atravessando.
  const remendos = (tela.remendos ?? [])
    .flatMap((r) =>
      r.amostra
        ? [`<rect x="${r.x}" y="${r.y}" width="${r.w}" height="${r.h}" fill="${corEm(r.amostra[0], r.amostra[1])}" />`]
        : Array.from(
            { length: r.h },
            (_, k) =>
              `<rect x="${r.x}" y="${r.y + k}" width="${r.w}" height="1" fill="${corEm(r.x + r.w + 30, r.y + k)}" />`,
          ),
    )
    .join("\n  ");

  return `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="${LARGURA}" height="${ALTURA}" viewBox="0 0 ${LARGURA} ${ALTURA}">
  <defs>
    <filter id="borrao" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="45" /></filter>
    <filter id="sombra" x="-50%" y="-50%" width="200%" height="200%">
      <feDropShadow dx="0" dy="10" stdDeviation="18" flood-color="#000000" flood-opacity="0.55" />
    </filter>
    <clipPath id="janela"><rect x="${x0}" y="${y0}" width="${alvoW}" height="${alvoH}" rx="${RAIO}" ry="${RAIO}" /></clipPath>
  </defs>
  <rect width="${LARGURA}" height="${ALTURA}" fill="#120d18" />
  <g filter="url(#borrao)"><image x="${fundoX}" y="${fundoY}" width="${fundoW}" height="${fundoH}" xlink:href="${dados}" /></g>
  <rect width="${LARGURA}" height="${ALTURA}" fill="#000000" opacity="0.45" />
  <g filter="url(#sombra)"><rect x="${x0}" y="${y0}" width="${alvoW}" height="${alvoH}" rx="${RAIO}" ry="${RAIO}" fill="#0b0b0d" /></g>
  <g clip-path="url(#janela)"><image x="${origX}" y="${origY}" width="${origW}" height="${origH}" xlink:href="${dados}" /></g>
  ${remendos}
  <rect x="${x0}" y="${y0}" width="${alvoW}" height="${alvoH}" rx="${RAIO}" ry="${RAIO}" fill="none" stroke="#ffffff" stroke-opacity="0.5" stroke-width="3" />
</svg>`;
}

mkdirSync("metadata", { recursive: true });
for (const tela of TELAS) {
  const png = new Resvg(svgDaTela(tela), { fitTo: { mode: "width", value: LARGURA } }).render().asPng();
  writeFileSync(tela.destino, png);
  console.log(`${tela.destino}  ${png.readUInt32BE(16)} × ${png.readUInt32BE(20)}  <-  ${tela.origem}`);
}
