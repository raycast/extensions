import { ROTULO_NIVEL } from "./lexico";
import { escaparMarkdown, realcarNoExemplo } from "./texto";
import { Etapa, Verbete } from "./tipos";

/** O cursor. Bloco fino, como o de um editor — não pisca, mas anda. */
const CURSOR = "▍";

const ROTULO_ETAPA: Record<Etapa, string> = {
  palavra: "A palavra",
  significado: "O significado",
  exemplo: "A palavra na frase",
};

function capitalizar(texto: string): string {
  return texto.charAt(0).toLocaleUpperCase("pt-BR") + texto.slice(1);
}

/**
 * A linha que está sendo digitada, com o cursor entre o que já passou e o que
 * falta. Como a digitação é bloqueada no erro, tudo à esquerda do cursor está
 * certo — a linha inteira é uma afirmação, não um diagnóstico.
 */
export function linhaComCursor(alvo: string, posicao: number): string {
  const letras = Array.from(alvo);
  const feito = escaparMarkdown(letras.slice(0, posicao).join(""));
  const falta = escaparMarkdown(letras.slice(posicao).join(""));
  return `${feito}${CURSOR}${falta}`;
}

export function barraDeProgresso(feitos: number, total: number, largura = 26): string {
  if (total <= 0) return "░".repeat(largura);
  const cheios = Math.min(largura, Math.round((feitos / total) * largura));
  return "█".repeat(cheios) + "░".repeat(largura - cheios);
}

export interface CartaoDeDigitacao {
  verbete: Verbete;
  etapa: Etapa;
  etapasDoModo: Etapa[];
  alvo: string;
  posicao: number;
  palavraNumero: number;
  totalPalavras: number;
}

/**
 * O cartão da etapa em andamento. O contexto é revelado aos poucos: a palavra
 * aparece sozinha, o significado só depois que a palavra foi vencida, a frase
 * só depois do significado. Mostrar tudo de uma vez tira a razão de digitar.
 */
export function markdownDaDigitacao(cartao: CartaoDeDigitacao): string {
  const { verbete, etapa, etapasDoModo, alvo, posicao, palavraNumero, totalPalavras } = cartao;
  const numeroDaEtapa = etapasDoModo.indexOf(etapa) + 1;
  const letras = Array.from(alvo).length;

  const linhas = [
    `###### PALAVRA ${palavraNumero} DE ${totalPalavras}  ·  ETAPA ${numeroDaEtapa} DE ${etapasDoModo.length}  ·  ${ROTULO_ETAPA[etapa].toLocaleUpperCase("pt-BR")}`,
    "",
    `# ${linhaComCursor(alvo, posicao)}`,
    "",
    `\`${barraDeProgresso(posicao, letras)}\`  ${posicao} / ${letras}`,
  ];

  const jaVencidas = etapasDoModo.slice(0, numeroDaEtapa - 1);
  if (jaVencidas.length > 0) {
    linhas.push("", "---", "", `## ${verbete.palavra}`, "", `\`${verbete.classe}\`  ·  ${ROTULO_NIVEL[verbete.nivel]}`);
    if (jaVencidas.includes("significado")) {
      linhas.push("", capitalizar(verbete.significado));
    }
  }

  return linhas.join("\n");
}

/** Cartão de leitura, para as palavras da fila que não estão sendo digitadas. */
export function markdownDoVerbete(verbete: Verbete): string {
  return [
    `# ${verbete.palavra}`,
    "",
    `\`${verbete.classe}\`  ·  ${ROTULO_NIVEL[verbete.nivel]}`,
    "",
    capitalizar(verbete.significado),
    "",
    "---",
    "",
    `_${realcarNoExemplo(verbete.exemplo, verbete.palavra)}_`,
  ].join("\n");
}

export function textoParaCopiar(verbete: Verbete): string {
  return [`${verbete.palavra} (${verbete.classe})`, verbete.significado, "", verbete.exemplo].join("\n");
}
