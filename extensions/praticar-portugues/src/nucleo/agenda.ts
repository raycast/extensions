import { CAIXA_MAXIMA, Progresso, RegistroPalavra, Verbete, registroVazio } from "./tipos";

const MINUTO = 60_000;
const DIA = 24 * 60 * MINUTO;

/**
 * Leitner. O índice é a caixa; o valor, quanto tempo a palavra some de vista.
 * A caixa 1 volta na mesma tarde de propósito — errou agora, revê agora.
 */
const ESPERA_POR_CAIXA = [0, 20 * MINUTO, 1 * DIA, 3 * DIA, 7 * DIA, 21 * DIA];

/** Quanta gente errou é o que decide a caixa nova. */
export function promover(anterior: RegistroPalavra, deslizes: number, agora: number): RegistroPalavra {
  let caixa: number;
  if (deslizes === 0) caixa = Math.min(CAIXA_MAXIMA, anterior.caixa + 1);
  else if (deslizes <= 2) caixa = Math.max(1, anterior.caixa);
  else caixa = 1;

  const espera = ESPERA_POR_CAIXA[caixa] ?? 0;
  return {
    ...anterior,
    caixa,
    tentativas: anterior.tentativas + 1,
    acertosLimpos: anterior.acertosLimpos + (deslizes === 0 ? 1 : 0),
    deslizesTotais: anterior.deslizesTotais + deslizes,
    vistaEm: agora,
    devidaEm: agora + espera,
  };
}

/** Palavra pulada não vira acerto nem erro grave, mas não pode sumir do radar. */
export function marcarPulada(anterior: RegistroPalavra, agora: number): RegistroPalavra {
  return {
    ...anterior,
    caixa: Math.max(1, Math.min(anterior.caixa, 2)),
    tentativas: anterior.tentativas + 1,
    vistaEm: agora,
    devidaEm: agora + (ESPERA_POR_CAIXA[1] ?? 0),
  };
}

export function estaDevida(registro: RegistroPalavra | undefined, agora: number): boolean {
  return registro !== undefined && registro.caixa > 0 && registro.devidaEm <= agora;
}

export function embaralhar<T>(lista: T[]): T[] {
  const copia = [...lista];
  for (let i = copia.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const a = copia[i] as T;
    const b = copia[j] as T;
    copia[i] = b;
    copia[j] = a;
  }
  return copia;
}

export interface OpcoesSessao {
  quantidade: number;
  revisaoEspacada: boolean;
  agora: number;
}

/**
 * Monta a fila da sessão.
 *
 * Com revisão espaçada ligada, no máximo 60% da fila é revisão. Sem esse teto,
 * quem já praticou muito nunca mais veria uma palavra nova — o vício clássico
 * de agendador Leitner cru.
 */
export function montarFila(verbetes: Verbete[], progresso: Progresso, opcoes: OpcoesSessao): Verbete[] {
  const { quantidade, revisaoEspacada, agora } = opcoes;

  if (!revisaoEspacada) {
    return embaralhar(verbetes).slice(0, quantidade);
  }

  const devidas: Verbete[] = [];
  const novas: Verbete[] = [];
  const descansando: Verbete[] = [];

  for (const verbete of verbetes) {
    const registro = progresso[verbete.palavra];
    if (registro === undefined || registro.caixa === 0) novas.push(verbete);
    else if (estaDevida(registro, agora)) devidas.push(verbete);
    else descansando.push(verbete);
  }

  const caixaDe = (v: Verbete) => progresso[v.palavra]?.caixa ?? 0;
  const devidaEmDe = (v: Verbete) => progresso[v.palavra]?.devidaEm ?? 0;

  devidas.sort((a, b) => caixaDe(a) - caixaDe(b) || devidaEmDe(a) - devidaEmDe(b));
  descansando.sort((a, b) => caixaDe(a) - caixaDe(b) || devidaEmDe(a) - devidaEmDe(b));

  const tetoRevisao = Math.ceil(quantidade * 0.6);
  const fila: Verbete[] = [];

  fila.push(...devidas.slice(0, tetoRevisao));
  fila.push(...embaralhar(novas).slice(0, quantidade - fila.length));
  fila.push(...devidas.slice(tetoRevisao, tetoRevisao + (quantidade - fila.length)));
  fila.push(...descansando.slice(0, quantidade - fila.length));

  return embaralhar(fila).slice(0, quantidade);
}

export function proximaRevisaoEmTexto(registro: RegistroPalavra | undefined, agora: number): string {
  if (!registro || registro.caixa === 0) return "nunca praticada";
  const falta = registro.devidaEm - agora;
  if (falta <= 0) return "para revisar agora";
  const dias = Math.round(falta / DIA);
  if (dias >= 1) return `volta em ${dias} ${dias === 1 ? "dia" : "dias"}`;
  const minutos = Math.max(1, Math.round(falta / MINUTO));
  return `volta em ${minutos} min`;
}

export function garantirRegistro(progresso: Progresso, palavra: string): RegistroPalavra {
  return progresso[palavra] ?? registroVazio();
}
