import { Recordes, Sessao } from "./tipos";

/**
 * Pausa maior que isso não conta como tempo digitando. Sem esse teto, atender
 * ao telefone no meio da sessão vira "12 PPM" e o número deixa de significar
 * qualquer coisa.
 */
export const TETO_PAUSA_MS = 8_000;

/** Acumulador de tempo efetivo de digitação. */
export class Cronometro {
  private acumulado = 0;
  private ultimoToque: number | null = null;

  tocar(agora: number): void {
    if (this.ultimoToque !== null) {
      this.acumulado += Math.min(agora - this.ultimoToque, TETO_PAUSA_MS);
    }
    this.ultimoToque = agora;
  }

  segundos(): number {
    return this.acumulado / 1000;
  }

  zerar(): void {
    this.acumulado = 0;
    this.ultimoToque = null;
  }
}

/** PPM no padrão da indústria: uma "palavra" são cinco caracteres. */
export function calcularPpm(caracteres: number, segundos: number): number {
  if (segundos <= 0.5 || caracteres === 0) return 0;
  return (caracteres / 5 / segundos) * 60;
}

/**
 * Precisão = caracteres do alvo sobre caracteres do alvo mais deslizes.
 * Um deslize é uma POSIÇÃO que em algum momento esteve errada, contada uma vez
 * só. Corrigir com backspace não apaga o deslize — ele aconteceu.
 */
export function calcularPrecisao(caracteres: number, deslizes: number): number {
  const total = caracteres + deslizes;
  if (total === 0) return 1;
  return caracteres / total;
}

export function diaDe(instante: number): string {
  const d = new Date(instante);
  const mes = String(d.getMonth() + 1).padStart(2, "0");
  const dia = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${mes}-${dia}`;
}

function diasEntre(anterior: string, atual: string): number {
  const a = Date.parse(`${anterior}T00:00:00`);
  const b = Date.parse(`${atual}T00:00:00`);
  if (Number.isNaN(a) || Number.isNaN(b)) return Number.POSITIVE_INFINITY;
  return Math.round((b - a) / 86_400_000);
}

export function atualizarRecordes(anteriores: Recordes, sessao: Sessao): Recordes {
  const hoje = diaDe(sessao.em);
  const distancia = anteriores.ultimoDia ? diasEntre(anteriores.ultimoDia, hoje) : Number.POSITIVE_INFINITY;

  let sequencia: number;
  if (distancia === 0) sequencia = Math.max(1, anteriores.sequenciaDias);
  else if (distancia === 1) sequencia = anteriores.sequenciaDias + 1;
  else sequencia = 1;

  return {
    melhorPpm: Math.max(anteriores.melhorPpm, sessao.ppm),
    melhorPrecisao: Math.max(anteriores.melhorPrecisao, sessao.precisao),
    sequenciaDias: sequencia,
    melhorSequenciaDias: Math.max(anteriores.melhorSequenciaDias, sequencia),
    ultimoDia: hoje,
  };
}

export interface Agregado {
  sessoes: number;
  palavras: number;
  caracteres: number;
  deslizes: number;
  segundos: number;
  ppmMedio: number;
  precisaoMedia: number;
}

export function agregar(sessoes: Sessao[]): Agregado {
  const base = sessoes.reduce(
    (acc, s) => ({
      palavras: acc.palavras + s.palavras,
      caracteres: acc.caracteres + s.caracteres,
      deslizes: acc.deslizes + s.deslizes,
      segundos: acc.segundos + s.segundos,
    }),
    { palavras: 0, caracteres: 0, deslizes: 0, segundos: 0 },
  );

  return {
    sessoes: sessoes.length,
    ...base,
    // Média ponderada pelo volume, não pela contagem de sessões: uma sessão de
    // três palavras não pode pesar igual a uma de cinquenta.
    ppmMedio: calcularPpm(base.caracteres, base.segundos),
    precisaoMedia: calcularPrecisao(base.caracteres, base.deslizes),
  };
}

export interface DiaResumo {
  dia: string;
  palavras: number;
  ppm: number;
  precisao: number;
}

export function porDia(sessoes: Sessao[], quantosDias: number, agora: number): DiaResumo[] {
  const mapa = new Map<string, Sessao[]>();
  for (const s of sessoes) {
    const chave = diaDe(s.em);
    mapa.set(chave, [...(mapa.get(chave) ?? []), s]);
  }

  const saida: DiaResumo[] = [];
  for (let i = quantosDias - 1; i >= 0; i--) {
    const dia = diaDe(agora - i * 86_400_000);
    const doDia = mapa.get(dia) ?? [];
    const somado = agregar(doDia);
    saida.push({
      dia,
      palavras: somado.palavras,
      ppm: somado.ppmMedio,
      precisao: somado.precisaoMedia,
    });
  }
  return saida;
}
