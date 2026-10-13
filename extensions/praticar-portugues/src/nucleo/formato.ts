import { Color, getPreferenceValues } from "@raycast/api";
import { CAIXA_MAXIMA, Preferencias } from "./tipos";

export function lerPreferencias(): Preferencias {
  return getPreferenceValues<Preferencias>();
}

export function percentual(fracao: number): string {
  return `${Math.round(fracao * 100)}%`;
}

export function ppmTexto(valor: number): string {
  return valor > 0 ? `${Math.round(valor)} PPM` : "—";
}

export function duracao(segundos: number): string {
  if (segundos < 60) return `${Math.round(segundos)} s`;
  const min = Math.floor(segundos / 60);
  const seg = Math.round(segundos % 60);
  return seg === 0 ? `${min} min` : `${min} min ${seg} s`;
}

/** A caixa de Leitner como cinco pontos: dá o estado num relance, sem número. */
export function medidorDeCaixa(caixa: number): string {
  const cheios = Math.max(0, Math.min(CAIXA_MAXIMA, caixa));
  return "●".repeat(cheios) + "○".repeat(CAIXA_MAXIMA - cheios);
}

export function rotuloDeCaixa(caixa: number): string {
  if (caixa === 0) return "Nunca praticada";
  if (caixa >= CAIXA_MAXIMA) return "Dominada";
  if (caixa === 1) return "Escorrega";
  return "Aprendendo";
}

export function corDaPrecisao(fracao: number): Color {
  if (fracao >= 0.98) return Color.Green;
  if (fracao >= 0.9) return Color.Yellow;
  return Color.Red;
}

export function corDaCaixa(caixa: number): Color {
  if (caixa === 0) return Color.SecondaryText;
  if (caixa >= CAIXA_MAXIMA) return Color.Green;
  if (caixa === 1) return Color.Red;
  return Color.Yellow;
}

export function tamanhoDaSessao(preferencias: Preferencias): number {
  const n = Number(preferencias.tamanhoSessao);
  return Number.isFinite(n) && n > 0 ? n : 20;
}

const NOMES_DE_DIA = ["dom", "seg", "ter", "qua", "qui", "sex", "sáb"];

export function diaCurto(iso: string): string {
  const t = Date.parse(`${iso}T12:00:00`);
  if (Number.isNaN(t)) return iso;
  const d = new Date(t);
  return `${NOMES_DE_DIA[d.getDay()]} ${String(d.getDate()).padStart(2, "0")}`;
}

/** Barra de blocos para gráfico em markdown, sem imagem nem dependência. */
export function barra(valor: number, maximo: number, largura = 14): string {
  if (maximo <= 0) return "·".repeat(largura);
  const cheios = Math.round((valor / maximo) * largura);
  return "█".repeat(cheios) + "·".repeat(Math.max(0, largura - cheios));
}
