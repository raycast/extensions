// Confere e ajusta as capturas de tela da Raycast Store.
//
// A Store exige PNG de EXATAMENTE 2000 × 1250 pixels em `metadata/`. O validador do CLI
// (`node_modules/@raycast/api/dist/commands/lint/index.js`) lê o IHDR do arquivo e reprova
// qualquer outro tamanho com `Wrong image size` — inclusive 1000 × 625, que ganha uma
// mensagem própria mandando usar tela retina. Não há tolerância e não há redimensionamento
// automático do lado deles.
//
// O caminho normal é o próprio Raycast produzir o arquivo já no tamanho certo: o comando
// `Capture Window` tem a opção `Save for Store`, e o app carrega 2000/1250 como constantes.
// Esta ferramenta existe para os dois casos em que aquilo não resolve:
//
//   node tools-capturas.mjs conferir
//       lista tudo que está em `metadata/` com o tamanho lido do IHDR e diz o que o
//       `ray lint` vai aceitar. Não escreve nada.
//
//   node tools-capturas.mjs ajustar <arquivo.png...> [--fundo #0f1012] [--saida metadata]
//       compõe cada arquivo em uma tela de 2000 × 1250. A imagem NUNCA é esticada: ela é
//       reduzida só se for maior que a tela, e então centralizada sobre um fundo sólido.
//       Ampliar uma captura pequena a deixaria borrada, e a revisão da Store olha isso.
//
//   node tools-capturas.mjs ajustar <arquivo.png...> --ampliar
//       libera a ampliação. Serve para imagem gerada (que não tem grão de captura real e
//       aguenta esticar) e para quem já veio em 16:10, onde ampliar é melhor que deixar
//       tarja preta dos dois lados. Quando a sobra fica em 4 px ou menos, a imagem é
//       ajustada ao quadro exato — a distorção resultante é inferior a 0,2% e some, e o
//       alternativo seria uma fresta escura na borda.
//
// O @resvg/resvg-js desenha `<image>` com data URI de PNG — foi conferido, não presumido.
// Ele não está no package.json; é ferramenta de build, igual ao tools-gerar-icones.mjs:
//   npm install --no-save @resvg/resvg-js
import { Resvg } from "@resvg/resvg-js";
import { readFileSync, writeFileSync, mkdirSync, readdirSync, existsSync } from "node:fs";
import { basename, extname, join } from "node:path";

const LARGURA = 2000;
const ALTURA = 1250;
const PASTA_PADRAO = "metadata";
const FUNDO_PADRAO = "#0f1012"; // cinza quase preto: neutro nos dois temas da Store

/** Lê largura e altura do IHDR, do mesmo jeito que o validador do CLI lê. */
function dimensoes(arquivo) {
  const bruto = readFileSync(arquivo);
  const assinatura = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  if (bruto.length < 33 || !bruto.subarray(0, 8).equals(assinatura)) {
    throw new Error("não é um PNG válido");
  }
  if (bruto.toString("ascii", 12, 16) !== "IHDR") {
    throw new Error("PNG sem IHDR legível");
  }
  return { largura: bruto.readUInt32BE(16), altura: bruto.readUInt32BE(20), bruto };
}

function conferir(pasta) {
  if (!existsSync(pasta)) {
    console.log(`A pasta '${pasta}/' não existe. Enquanto ela não existir, o 'ray lint'`);
    console.log(`pula a checagem de capturas — e a revisão da Store não.`);
    return 0;
  }
  const arquivos = readdirSync(pasta, { withFileTypes: true })
    .filter((e) => e.isFile())
    .map((e) => e.name)
    .sort();
  if (arquivos.length === 0) {
    console.log(`'${pasta}/' está vazia. Faltam as 6 capturas.`);
    return 0;
  }

  let reprovados = 0;
  let pngs = 0;
  for (const nome of arquivos) {
    if (extname(nome).toLowerCase() !== ".png") {
      // O glob do lint é metadata/*.png, então isto não reprova — mas vai junto no
      // pacote do `ray publish`, e ninguém quer um rascunho na listagem.
      console.log(`  ??  ${nome}  — não é .png; o lint ignora, mas tire daqui mesmo assim`);
      continue;
    }
    pngs++;
    try {
      const { largura, altura } = dimensoes(join(pasta, nome));
      const ok = largura === LARGURA && altura === ALTURA;
      if (!ok) reprovados++;
      console.log(`  ${ok ? "ok" : "XX"}  ${nome}  ${largura} × ${altura}${ok ? "" : `  — o lint vai reprovar: exige ${LARGURA} × ${ALTURA}`}`);
    } catch (erro) {
      reprovados++;
      console.log(`  XX  ${nome}  — ${erro.message}`);
    }
  }

  console.log(`\n${pngs} PNG em '${pasta}/', ${reprovados} fora do tamanho.`);
  if (pngs < 6) console.log(`A Store espera 6; faltam ${6 - pngs}.`);
  return reprovados;
}

function ajustar(entradas, { fundo, saida, ampliar }) {
  mkdirSync(saida, { recursive: true });
  for (const entrada of entradas) {
    const { largura, altura, bruto } = dimensoes(entrada);
    // `contain`: cabe inteira. Sem `--ampliar`, a escala nunca passa de 1.
    const teto = ampliar ? Infinity : 1;
    const escala = Math.min(LARGURA / largura, ALTURA / altura, teto);
    let l = Math.round(largura * escala);
    let a = Math.round(altura * escala);
    // Sobra de poucos pixels vira fresta escura na borda, que fica pior do que a
    // distorção de menos de 0,2% necessária para fechar o quadro.
    if (ampliar && LARGURA - l <= 4 && ALTURA - a <= 4) {
      l = LARGURA;
      a = ALTURA;
    }
    const x = Math.round((LARGURA - l) / 2);
    const y = Math.round((ALTURA - a) / 2);
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="${LARGURA}" height="${ALTURA}" viewBox="0 0 ${LARGURA} ${ALTURA}">
  <rect width="${LARGURA}" height="${ALTURA}" fill="${fundo}" />
  <image x="${x}" y="${y}" width="${l}" height="${a}" xlink:href="data:image/png;base64,${bruto.toString("base64")}" />
</svg>`;
    const png = new Resvg(svg, { fitTo: { mode: "width", value: LARGURA } }).render().asPng();
    const destino = join(saida, basename(entrada));
    writeFileSync(destino, png);
    const conta = dimensoes(destino);
    const comoFoi =
      escala === 1
        ? "centralizada, sem redimensionar"
        : escala < 1
          ? `reduzida a ${(escala * 100).toFixed(1)}%`
          : `ampliada a ${(escala * 100).toFixed(1)}%`;
    console.log(
      `${destino}  ${conta.largura} × ${conta.altura}  <-  ${basename(entrada)} ${largura} × ${altura} (${comoFoi})`,
    );
  }
}

const [modo = "conferir", ...resto] = process.argv.slice(2);

if (modo === "conferir") {
  process.exit(conferir(resto[0] ?? PASTA_PADRAO) === 0 ? 0 : 1);
} else if (modo === "ajustar") {
  const opcao = (nome, padrao) => {
    const i = resto.indexOf(nome);
    return i === -1 ? padrao : resto[i + 1];
  };
  const fundo = opcao("--fundo", FUNDO_PADRAO);
  const saida = opcao("--saida", PASTA_PADRAO);
  const ampliar = resto.includes("--ampliar");
  const semValor = new Set(["--ampliar"]);
  const entradas = resto.filter(
    (v, i) => !v.startsWith("--") && !(resto[i - 1]?.startsWith("--") && !semValor.has(resto[i - 1])),
  );
  if (entradas.length === 0) {
    console.error("Diga quais arquivos ajustar. Ex.: node tools-capturas.mjs ajustar C:/caminho/foto.png");
    process.exit(1);
  }
  ajustar(entradas, { fundo, saida, ampliar });
} else {
  console.error(`Modo desconhecido: ${modo}. Use 'conferir' ou 'ajustar'.`);
  process.exit(1);
}
