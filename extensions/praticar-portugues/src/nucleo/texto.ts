/**
 * O motor da digitação.
 *
 * A regra é bloquear, não corrigir: o campo só aceita o que for prefixo exato
 * do alvo. Tecla errada é recusada na hora, contada como deslize e nunca entra
 * no texto. Por isso tudo o que está à esquerda do cursor está certo por
 * construção — não existe estado "digitado porém errado" para desenhar.
 *
 * A dobra de acento e de caixa é aplicada CARACTERE A CARACTERE, nunca à
 * string inteira. Tirar acento de "ê" devolve "e" — um caractere por um
 * caractere — então os índices do alvo e do digitado continuam alinhados mesmo
 * com a exigência de acento desligada.
 */

// Faixa dos diacríticos combinantes (U+0300–U+036F). Escrita em escape de
// propósito: em literal, são caracteres invisíveis que qualquer editor mastiga.
const COMBINANTES = new RegExp("[\\u0300-\\u036f]", "g");

/**
 * Espaço de largura zero. Serve de único propósito: garantir que o valor de
 * `searchText` MUDE quando uma tecla é recusada. Devolver a mesma string que o
 * Raycast já tem não força a barra de busca a descartar o caractere errado —
 * alternar entre "prefixo" e "prefixo + invisível" força.
 */
export const MARCA_INVISIVEL = String.fromCharCode(0x200b);

export function limparMarca(texto: string): string {
  return texto.split(MARCA_INVISIVEL).join("");
}

export interface OpcoesComparacao {
  exigirAcento: boolean;
  exigirCaixa: boolean;
}

export function dobrar(caractere: string, opcoes: OpcoesComparacao): string {
  let saida = caractere.normalize("NFC");
  if (!opcoes.exigirAcento) {
    saida = saida.normalize("NFD").replace(COMBINANTES, "").normalize("NFC");
  }
  if (!opcoes.exigirCaixa) {
    saida = saida.toLocaleLowerCase("pt-BR");
  }
  return saida;
}

export function semAcento(texto: string): string {
  return texto.normalize("NFD").replace(COMBINANTES, "").normalize("NFC");
}

export interface Aceitacao {
  /** O texto que a barra de busca deve conter: só o prefixo certo. */
  aceito: string;
  /** Quantos caracteres do alvo já foram vencidos. É onde o cursor fica. */
  posicao: number;
  /** O caractere que acabou de ser recusado, se houve. */
  recusado?: string;
  /** O que o alvo pedia na posição do cursor. */
  esperado?: string;
  completo: boolean;
}

export function aceitar(alvo: string, digitado: string, opcoes: OpcoesComparacao): Aceitacao {
  const letrasAlvo = Array.from(alvo.normalize("NFC"));
  const letrasDigitadas = Array.from(limparMarca(digitado).normalize("NFC"));

  let i = 0;
  while (i < letrasDigitadas.length && i < letrasAlvo.length) {
    const esperado = letrasAlvo[i];
    const recebido = letrasDigitadas[i];
    if (esperado === undefined || recebido === undefined) break;
    if (dobrar(esperado, opcoes) !== dobrar(recebido, opcoes)) break;
    i++;
  }

  const sobrou = i < letrasDigitadas.length;
  return {
    aceito: letrasDigitadas.slice(0, i).join(""),
    posicao: i,
    recusado: sobrou ? letrasDigitadas[i] : undefined,
    esperado: letrasAlvo[i],
    completo: i === letrasAlvo.length && letrasAlvo.length > 0,
  };
}

/**
 * Divide o alvo em pedaços para a régua de aprovação.
 *
 * A régua troca de granularidade pela PRESENÇA DE ESPAÇO, não por comprimento.
 * Um alvo sem espaço é uma palavra: cabe letra a letra, e é assim que se vê
 * qual letra está sob o cursor. Um alvo com espaço é uma frase: letra a letra
 * viraria dezenas de etiquetas ilegíveis, várias delas etiquetas de espaço em
 * branco — então vai palavra a palavra.
 */
export interface Pedaco {
  texto: string;
  inicio: number;
  fim: number;
}

export function fatiar(alvo: string): Pedaco[] {
  const letras = Array.from(alvo);
  if (!letras.includes(" ")) {
    return letras.map((texto, i) => ({ texto, inicio: i, fim: i + 1 }));
  }

  const pedacos: Pedaco[] = [];
  let inicio = 0;
  letras.forEach((letra, i) => {
    if (letra === " ") {
      if (i > inicio) pedacos.push({ texto: letras.slice(inicio, i).join(""), inicio, fim: i });
      inicio = i + 1;
    }
  });
  if (inicio < letras.length) {
    pedacos.push({ texto: letras.slice(inicio).join(""), inicio, fim: letras.length });
  }
  return pedacos;
}

export type EstadoPedaco = "certo" | "errado" | "atual" | "pendente";

export function estadoDoPedaco(pedaco: Pedaco, posicao: number, recusouAgora: boolean): EstadoPedaco {
  if (pedaco.fim <= posicao) return "certo";
  if (pedaco.inicio <= posicao) return recusouAgora ? "errado" : "atual";
  return "pendente";
}

/** Envolve a palavra em negrito dentro da frase de exemplo, respeitando flexão. */
export function realcarNoExemplo(exemplo: string, palavra: string): string {
  const radical = semAcento(palavra).toLocaleLowerCase("pt-BR");
  const nucleo = radical.slice(0, Math.max(4, radical.length - 3));
  const alvo = new RegExp(`(^|[^\\p{L}])(\\p{L}*${escaparRegex(nucleo)}\\p{L}*)`, "iu");
  const achado = semAcento(exemplo).toLocaleLowerCase("pt-BR").match(alvo);
  if (!achado || achado.index === undefined) return exemplo;

  const inicio = achado.index + (achado[1]?.length ?? 0);
  const fim = inicio + (achado[2]?.length ?? 0);
  return `${exemplo.slice(0, inicio)}**${exemplo.slice(inicio, fim)}**${exemplo.slice(fim)}`;
}

function escaparRegex(texto: string): string {
  return texto.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Neutraliza o que o Markdown interpretaria dentro da linha de digitação.
 * O léxico hoje não tem asterisco nem crase, mas a linha é montada a partir de
 * dado — e dado que vira marcação é como texto vira injeção.
 */
export function escaparMarkdown(texto: string): string {
  return texto.replace(/([\\`*_[\]~|])/g, "\\$1");
}
