/**
 * A sequência da sessão, sem React.
 *
 * Enquanto isto morava dentro do componente, a única coisa testável era
 * `aceitar()` — e `aceitar()` estar certo nunca provou que quem a chama
 * encadeia as etapas direito. É no encadeamento que mora o defeito caro:
 * etapa que não vira, recusa que vaza para a palavra seguinte, marca invisível
 * que não alterna. Aqui isso vira função pura e a bateria alcança.
 */
import { MARCA_INVISIVEL, OpcoesComparacao, aceitar } from "./texto";
import { Etapa, Verbete } from "./tipos";

export function alvoDaEtapa(verbete: Verbete, etapa: Etapa): string {
  if (etapa === "palavra") return verbete.palavra;
  if (etapa === "significado") return verbete.significado;
  return verbete.exemplo;
}

export function caracteresDoVerbete(verbete: Verbete, etapas: Etapa[]): number {
  return etapas.reduce((soma, etapa) => soma + Array.from(alvoDaEtapa(verbete, etapa)).length, 0);
}

export type Passo =
  /** Tecla recusada: o campo volta ao prefixo certo e o cursor não anda. */
  | { tipo: "recusa"; campo: string; recusado: string; esperado: string | undefined; marcaLigada: boolean }
  /** Tecla aceita, etapa ainda em andamento. */
  | { tipo: "segue"; campo: string; posicao: number }
  /** Etapa vencida, ainda há etapa depois desta. */
  | { tipo: "etapa-vencida"; etapaIndice: number }
  /** Última etapa vencida: o verbete acabou. */
  | { tipo: "verbete-vencido" };

export interface EntradaDeTecla {
  /** O que a barra de busca entregou, marca invisível inclusive. */
  bruto: string;
  alvo: string;
  opcoes: OpcoesComparacao;
  etapaIndice: number;
  totalEtapas: number;
  marcaLigada: boolean;
}

export function processarTecla(entrada: EntradaDeTecla): Passo {
  const r = aceitar(entrada.alvo, entrada.bruto, entrada.opcoes);

  if (r.recusado !== undefined) {
    // Alterna a marca para que o valor de `searchText` MUDE. Devolver a mesma
    // string não faz a barra de busca soltar o caractere errado.
    const marcaLigada = !entrada.marcaLigada;
    return {
      tipo: "recusa",
      campo: r.aceito + (marcaLigada ? MARCA_INVISIVEL : ""),
      recusado: r.recusado,
      esperado: r.esperado,
      marcaLigada,
    };
  }

  if (!r.completo) return { tipo: "segue", campo: r.aceito, posicao: r.posicao };

  if (entrada.etapaIndice + 1 < entrada.totalEtapas) {
    return { tipo: "etapa-vencida", etapaIndice: entrada.etapaIndice + 1 };
  }

  return { tipo: "verbete-vencido" };
}

/**
 * Próxima palavra ainda não concluída, dando a volta na fila.
 * Devolve `null` quando não sobrou nenhuma — é o fim da sessão.
 */
export function proximoIndice(atual: number, total: number, concluidos: ReadonlySet<number>): number | null {
  if (total === 0) return null;
  for (let passo = 1; passo <= total; passo++) {
    const candidato = (atual + passo) % total;
    if (!concluidos.has(candidato)) return candidato;
  }
  return null;
}
