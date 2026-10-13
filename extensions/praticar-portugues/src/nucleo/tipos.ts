export type Nivel = 1 | 2 | 3;

/** Um verbete do léxico embarcado. */
export interface Verbete {
  palavra: string;
  classe: string;
  significado: string;
  exemplo: string;
  nivel: Nivel;
}

/**
 * O que sabemos sobre a relação do usuário com uma palavra.
 * `caixa` é o nível de Leitner: 0 = nunca vista, 5 = dominada.
 */
export interface RegistroPalavra {
  caixa: number;
  tentativas: number;
  acertosLimpos: number;
  deslizesTotais: number;
  vistaEm: number;
  devidaEm: number;
  melhorPpm: number;
}

export type Progresso = Record<string, RegistroPalavra>;

/** Resultado de uma palavra dentro de uma sessão, antes de virar progresso. */
export interface ResultadoPalavra {
  palavra: string;
  caracteres: number;
  deslizes: number;
  segundos: number;
  pulada: boolean;
}

export interface Sessao {
  em: number;
  palavras: number;
  caracteres: number;
  deslizes: number;
  ppm: number;
  precisao: number;
  segundos: number;
}

export interface Recordes {
  melhorPpm: number;
  melhorPrecisao: number;
  sequenciaDias: number;
  melhorSequenciaDias: number;
  ultimoDia: string;
}

/** As três coisas que se digita de cada verbete, nesta ordem. */
export type Etapa = "palavra" | "significado" | "exemplo";

export type Modo = "completo" | "palavra-significado" | "palavra";

export const ETAPAS_DO_MODO: Record<Modo, Etapa[]> = {
  completo: ["palavra", "significado", "exemplo"],
  "palavra-significado": ["palavra", "significado"],
  palavra: ["palavra"],
};

export interface Preferencias {
  modo: Modo;
  nivel: "todos" | "1" | "2" | "3";
  tamanhoSessao: string;
  exigirAcento: boolean;
  exigirCaixa: boolean;
  revisaoEspacada: boolean;
}

export const CAIXA_MAXIMA = 5;

/** Estado inicial de uma palavra que o usuário nunca viu. */
export function registroVazio(): RegistroPalavra {
  return {
    caixa: 0,
    tentativas: 0,
    acertosLimpos: 0,
    deslizesTotais: 0,
    vistaEm: 0,
    devidaEm: 0,
    melhorPpm: 0,
  };
}
