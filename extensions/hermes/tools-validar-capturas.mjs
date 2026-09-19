// Porte, em Node, do validador de capturas do próprio `raycast/extensions`.
//
// O PR de publicação roda `.github/workflows/metadata_image_enforcer.yml`, que chama
// `scripts/check_raycast_images.py`. Ele NÃO checa só o tamanho: mede a margem entre a
// borda da janela do Raycast e a borda da imagem, e exige
//
//   - cada lado entre 8% e 17% da dimensão (alvo 12,5%);
//   - no máximo 4 pontos de diferença entre esquerda/direita e entre topo/base.
//
// Descobrir isso pelo CI custa um ciclo de PR. Este arquivo existe para descobrir antes:
//
//   node tools-validar-capturas.mjs metadata/*.png
//
// A detecção da janela é o porte fiel de `find_window_bbox`, inclusive o
// `_find_wide_horizontal_bbox` — que só entra em cena quando a margem do primeiro
// resultado não fecha, e é justamente ele que salva as telas com painel dividido.
import { readFileSync } from "node:fs";
import { inflateSync } from "node:zlib";

const MARGEM_ALVO = 0.125;
const MARGEM_TOL = 0.045;
const ASSIMETRIA_MAX = 0.04;
const TOLERANCIA = 35;

/** Decodifica PNG de 8 bits, RGB ou RGBA, sem entrelaçamento — o que o resvg gera. */
export function decodePng(arquivo) {
  const png = readFileSync(arquivo);
  let off = 8;
  let w = 0;
  let h = 0;
  let prof = 0;
  let cor = 0;
  let entrelace = 0;
  const idat = [];
  while (off < png.length) {
    const len = png.readUInt32BE(off);
    const tipo = png.toString("ascii", off + 4, off + 8);
    const d = png.subarray(off + 8, off + 8 + len);
    if (tipo === "IHDR") {
      w = d.readUInt32BE(0);
      h = d.readUInt32BE(4);
      prof = d[8];
      cor = d[9];
      entrelace = d[12];
    } else if (tipo === "IDAT") idat.push(d);
    else if (tipo === "IEND") break;
    off += 12 + len;
  }
  if (prof !== 8 || entrelace !== 0 || (cor !== 2 && cor !== 6)) {
    throw new Error(`PNG não suportado (profundidade ${prof}, cor ${cor}, entrelace ${entrelace})`);
  }
  const canais = cor === 6 ? 4 : 3;
  const raw = inflateSync(Buffer.concat(idat));
  const stride = w * canais + 1;
  const rgb = new Uint8Array(w * h * 3);
  let anterior = new Uint8Array(w * canais);
  for (let r = 0; r < h; r++) {
    const filtro = raw[r * stride];
    const linha = new Uint8Array(raw.subarray(r * stride + 1, r * stride + 1 + w * canais));
    for (let i = 0; i < linha.length; i++) {
      const a = i >= canais ? linha[i - canais] : 0;
      const b = anterior[i];
      const c = i >= canais ? anterior[i - canais] : 0;
      if (filtro === 1) linha[i] = (linha[i] + a) & 255;
      else if (filtro === 2) linha[i] = (linha[i] + b) & 255;
      else if (filtro === 3) linha[i] = (linha[i] + ((a + b) >> 1)) & 255;
      else if (filtro === 4) {
        const p = a + b - c;
        const pa = Math.abs(p - a);
        const pb = Math.abs(p - b);
        const pc = Math.abs(p - c);
        linha[i] = (linha[i] + (pa <= pb && pa <= pc ? a : pb <= pc ? b : c)) & 255;
      }
    }
    for (let x = 0; x < w; x++) {
      const s = x * canais;
      const d = (r * w + x) * 3;
      rgb[d] = linha[s];
      rgb[d + 1] = linha[s + 1];
      rgb[d + 2] = linha[s + 2];
    }
    anterior = linha;
  }
  return { w, h, rgb };
}

const px = (im, x, y, c) => im.rgb[(y * im.w + x) * 3 + c];
const dif = (im, x1, y1, x2, y2) => {
  let m = 0;
  for (let c = 0; c < 3; c++) {
    const d = Math.abs(px(im, x2, y2, c) - px(im, x1, y1, c));
    if (d > m) m = d;
  }
  return m;
};
const gradCol = (im, x) => {
  const g = new Int32Array(im.h - 1);
  for (let y = 0; y < im.h - 1; y++) g[y] = dif(im, x, y, x, y + 1);
  return g;
};
const gradRow = (im, y) => {
  const g = new Int32Array(im.w - 1);
  for (let x = 0; x < im.w - 1; x++) g[x] = dif(im, x, y, x + 1, y);
  return g;
};
const linspace = (a, b, n) => Array.from({ length: n }, (_, i) => Math.trunc(a + ((b - a) * i) / (n - 1)));
function mediana(v) {
  const s = [...v].sort((a, b) => a - b);
  const m = s.length >> 1;
  return Math.trunc(s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2);
}

/**
 * Borda de janela é uma reta LONGA; bolha de papel de parede é curva e pontua pouco por
 * coluna. Serve para achar a janela na captura de ORIGEM, antes de recompor — é outro
 * problema do que o validador resolve, e por isso é outro detector.
 */
export function janelaPorRetas(im, limiar = 20, fracao = 0.35) {
  const { w, h } = im;
  const col = new Int32Array(w - 1);
  const row = new Int32Array(h - 1);
  for (let x = 0; x < w - 1; x++) {
    let n = 0;
    for (let y = 0; y < h; y++) if (dif(im, x, y, x + 1, y) > limiar) n++;
    col[x] = n;
  }
  for (let y = 0; y < h - 1; y++) {
    let n = 0;
    for (let x = 0; x < w; x++) if (dif(im, x, y, x, y + 1) > limiar) n++;
    row[y] = n;
  }
  const fortes = (arr) => {
    const mx = Math.max(...arr);
    const ok = [];
    for (let i = 0; i < arr.length; i++) if (arr[i] > fracao * mx) ok.push(i);
    return ok;
  };
  const c = fortes(col);
  const r = fortes(row);
  return { left: c[0] + 1, right: c[c.length - 1], top: r[0] + 1, bottom: r[r.length - 1] };
}

function saudavel(b, w, h) {
  const area = ((b.bottom - b.top) * (b.right - b.left)) / (h * w);
  const lados = [b.top / h, (h - b.bottom - 1) / h, b.left / w, (w - b.right - 1) / w];
  return area > 0.05 && lados.every((v) => v >= 0 && v <= 0.7);
}

function margemFecha(b, w, h) {
  const m = margens(b, w, h);
  const lo = MARGEM_ALVO - MARGEM_TOL;
  const hi = MARGEM_ALVO + MARGEM_TOL;
  return (
    [m.topo, m.base, m.esq, m.dir].every((p) => p >= lo && p <= hi) &&
    Math.abs(m.esq - m.dir) <= ASSIMETRIA_MAX &&
    Math.abs(m.topo - m.base) <= ASSIMETRIA_MAX
  );
}

function margens(b, w, h) {
  return { topo: b.top / h, base: (h - b.bottom - 1) / h, esq: b.left / w, dir: (w - b.right - 1) / w };
}

/** Porte de `_find_wide_horizontal_bbox`: procura a borda em faixas fixas, 8–22% e 78–92%. */
function fallbackHorizontal(im, top, bottom, limiar) {
  const { w, h } = im;
  const faixaEsq = [Math.trunc(w * 0.08), Math.trunc(w * 0.22)];
  const faixaDir = [Math.trunc(w * 0.78), Math.trunc(w * 0.92)];
  const candidatas = [0.03, 0.08, 0.2, 0.5, 0.8].map((r) => top + Math.trunc((bottom - top) * r));
  candidatas.push(Math.trunc(h / 2), Math.trunc(h * 0.16), Math.trunc(h * 0.84));
  const esq = [];
  const dir = [];
  for (const y of [...new Set(candidatas)].filter((v) => v >= 0 && v < h).sort((a, b) => a - b)) {
    const g = gradRow(im, y);
    for (let i = faixaEsq[0]; i < faixaEsq[1]; i++)
      if (g[i] > limiar) {
        esq.push(i + 1);
        break;
      }
    for (let i = faixaDir[1] - 1; i >= faixaDir[0]; i--)
      if (g[i] > limiar) {
        dir.push(i);
        break;
      }
  }
  if (esq.length < 2 || dir.length < 2) return null;
  const r = { top, left: mediana(esq), bottom, right: mediana(dir) };
  return saudavel(r, w, h) ? r : null;
}

/** Porte de `find_window_bbox`. */
export function janelaComoARaycastVe(im) {
  const { w, h } = im;
  const n = 25;
  const gAlto = Math.max(30, Math.min(90, 105 - TOLERANCIA));
  const gBaixo = Math.max(15, gAlto - 30);
  const cols = linspace(Math.trunc(w * 0.05), Math.trunc(w * 0.95), n);
  const rows = linspace(Math.trunc(h * 0.05), Math.trunc(h * 0.95), n);
  let ctrCols = cols.filter((v) => v >= w * 0.35 && v <= w * 0.65);
  let ctrRows = rows.filter((v) => v >= h * 0.35 && v <= h * 0.65);
  if (ctrCols.length < 3) ctrCols = cols.slice(Math.trunc(n / 3), -Math.trunc(n / 3));
  if (ctrRows.length < 3) ctrRows = rows.slice(Math.trunc(n / 3), -Math.trunc(n / 3));
  const cy0 = Math.trunc(h / 2);
  const cx0 = Math.trunc(w / 2);
  const topE = [];
  const leftE = [];
  const rightE = [];
  const botPrel = [];
  for (const cx of ctrCols) {
    const g = gradCol(im, cx);
    for (let y = cy0 - 1; y >= 0; y--)
      if (g[y] > gAlto) {
        topE.push(y + 1);
        break;
      }
    for (let y = cy0; y < h - 1; y++)
      if (g[y] > gAlto) {
        botPrel.push(y);
        break;
      }
  }
  for (const cy of ctrRows) {
    const g = gradRow(im, cy);
    for (let x = cx0 - 1; x >= 0; x--)
      if (g[x] > gAlto) {
        leftE.push(x + 1);
        break;
      }
    for (let x = cx0; x < w - 1; x++)
      if (g[x] > gAlto) {
        rightE.push(x);
        break;
      }
  }
  const bdy = Math.max(Math.trunc(h * 0.01), 3);
  const bdx = Math.max(Math.trunc(w * 0.01), 3);
  const manter = (lista, teste) => (lista.filter(teste).length ? lista.filter(teste) : lista);
  const leftUse = manter(leftE, (e) => e > bdx);
  const rightUse = manter(rightE, (e) => e < w - bdx);
  const topUse = manter(topE, (e) => e > bdy);
  if (!leftUse.length || !rightUse.length) return null;
  const medLeft = Math.min(...leftUse);
  const medRight = Math.max(...rightUse);
  let inner = cols.filter((v) => v >= medLeft && v <= medRight);
  if (inner.length < 3) inner = cols.slice(Math.trunc(n / 4), -Math.trunc(n / 4));
  const limiteTopo = Math.trunc(h * 0.35);
  const topP2 = [];
  for (const cx of inner) {
    const g = gradCol(im, cx);
    for (let y = 0; y < limiteTopo; y++)
      if (g[y] > gBaixo) {
        topP2.push(y + 1);
        break;
      }
  }
  let medTop = null;
  if (topP2.length) medTop = mediana(manter(topP2, (e) => e > bdy));
  else if (topUse.length) medTop = Math.min(...topUse);
  const buscaBase = Math.trunc(h * 0.95);
  const buscaTopo = Math.max((medTop ?? 0) + 30, Math.trunc(h / 4));
  const botP2 = [];
  for (const cx of inner) {
    const g = gradCol(im, cx);
    for (let y = Math.min(buscaBase, h - 2); y > buscaTopo; y--)
      if (g[y] > gBaixo) {
        botP2.push(y);
        break;
      }
  }
  let medBot = null;
  for (const cand of [botP2, botPrel])
    if (cand.length) {
      medBot = mediana(manter(cand, (e) => e < h - bdy));
      break;
    }
  if (medTop === null || medBot === null) return null;
  const primeiro = { top: medTop, left: medLeft, bottom: medBot, right: medRight };
  if (!saudavel(primeiro, w, h)) return null;
  if (!margemFecha(primeiro, w, h)) {
    const larga = fallbackHorizontal(im, medTop, medBot, gBaixo);
    if (larga && margemFecha(larga, w, h)) return larga;
  }
  return primeiro;
}

// O compositor importa `decodePng` e `janelaPorRetas` daqui, então o modo linha de comando
// só roda quando este é o arquivo chamado.
const comoComando = (process.argv[1] ?? "").endsWith("tools-validar-capturas.mjs");
const arquivos = comoComando ? process.argv.slice(2) : [];
if (comoComando && arquivos.length === 0) {
  console.error("Uso: node tools-validar-capturas.mjs metadata/*.png");
  process.exit(1);
}

let reprovados = 0;
for (const arquivo of arquivos) {
  const im = decodePng(arquivo);
  const bb = janelaComoARaycastVe(im);
  if (im.w !== 2000 || im.h !== 1250) {
    reprovados++;
    console.log(`${arquivo}  ${im.w}×${im.h} — tamanho errado, exige 2000 × 1250`);
    continue;
  }
  if (!bb) {
    reprovados++;
    console.log(`${arquivo}  não detectou a janela`);
    continue;
  }
  const m = margens(bb, im.w, im.h);
  const lo = MARGEM_ALVO - MARGEM_TOL;
  const hi = MARGEM_ALVO + MARGEM_TOL;
  const pct = (v) => `${(v * 100).toFixed(1)}%`;
  const problemas = [];
  for (const [nome, v] of [
    ["topo", m.topo],
    ["base", m.base],
    ["esq", m.esq],
    ["dir", m.dir],
  ]) {
    if (v < lo || v > hi) problemas.push(`${nome} ${pct(v)} fora de ${pct(lo)}–${pct(hi)}`);
  }
  if (Math.abs(m.esq - m.dir) > ASSIMETRIA_MAX) problemas.push(`assimetria esq/dir ${pct(Math.abs(m.esq - m.dir))}`);
  if (Math.abs(m.topo - m.base) > ASSIMETRIA_MAX) problemas.push(`assimetria topo/base ${pct(Math.abs(m.topo - m.base))}`);
  if (problemas.length) reprovados++;
  console.log(
    `${problemas.length ? "XX" : "ok"}  ${arquivo}  topo ${pct(m.topo)}  base ${pct(m.base)}  ` +
      `esq ${pct(m.esq)}  dir ${pct(m.dir)}${problemas.length ? `  — ${problemas.join(", ")}` : ""}`,
  );
}
if (comoComando) {
  console.log(`\n${arquivos.length} imagem(ns), ${reprovados} reprovada(s).`);
  process.exit(reprovados === 0 ? 0 : 1);
}
