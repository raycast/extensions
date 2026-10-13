/**
 * Precos de lista da API Anthropic, em dolares por milhao de tokens.
 *
 * Cache write custa 1.25x o input para a TTL de 5 minutos e 2x para a de 1 hora.
 * Cache read custa 0.1x o input. Essas razoes valem para todos os modelos, entao
 * derivamos os quatro precos a partir do preco de input.
 */

export type Pricing = {
  input: number;
  output: number;
  cacheWrite5m: number;
  cacheWrite1h: number;
  cacheRead: number;
};

function derive(input: number, output: number): Pricing {
  return {
    input,
    output,
    cacheWrite5m: input * 1.25,
    cacheWrite1h: input * 2,
    cacheRead: input * 0.1,
  };
}

/** Sonnet 5 tem preco promocional ate 31/08/2026. */
const SONNET_5_INTRO_LAST_DAY = "2026-08-31";

/**
 * Resolve o preco de um registro de uso.
 *
 * @param model  id do modelo como gravado no log (ex.: "claude-opus-5")
 * @param day    dia local no formato YYYY-MM-DD, para precos com janela promocional
 * @param speed  "fast" quando a requisicao usou fast mode (tarifa premium)
 */
export function pricingFor(model: string | undefined, day: string, speed?: string): Pricing | null {
  if (!model) return null;
  const m = model.toLowerCase();

  // Modelos sinteticos que o Claude Code grava para eventos internos.
  if (m.startsWith("<")) return null;

  const isFast = speed === "fast";

  if (m.includes("fable") || m.includes("mythos")) return derive(10, 50);

  if (m.includes("opus-5") || m.includes("opus-4-8")) {
    // Fast mode e cobrado a 10/50 nos modelos que o suportam.
    return isFast ? derive(10, 50) : derive(5, 25);
  }
  if (m.includes("opus")) return derive(5, 25);

  if (m.includes("sonnet-5")) {
    return day <= SONNET_5_INTRO_LAST_DAY ? derive(2, 10) : derive(3, 15);
  }
  if (m.includes("sonnet")) return derive(3, 15);

  if (m.includes("haiku-4")) return derive(1, 5);
  if (m.includes("haiku")) return derive(0.8, 4);

  return null;
}

export type TokenCounts = {
  input: number;
  output: number;
  cacheWrite5m: number;
  cacheWrite1h: number;
  cacheRead: number;
};

export function costOf(tokens: TokenCounts, p: Pricing | null): number {
  if (!p) return 0;
  return (
    (tokens.input * p.input +
      tokens.output * p.output +
      tokens.cacheWrite5m * p.cacheWrite5m +
      tokens.cacheWrite1h * p.cacheWrite1h +
      tokens.cacheRead * p.cacheRead) /
    1_000_000
  );
}

/** Nome curto e legivel para exibicao. */
export function modelLabel(model: string): string {
  const m = model.toLowerCase();
  if (m.startsWith("<")) return "interno";
  const pretty = m
    .replace(/^claude-/, "")
    .replace(/-(\d)-(\d)$/, " $1.$2")
    .replace(/-(\d)$/, " $1")
    .replace(/-\d{8}$/, "");
  return pretty.charAt(0).toUpperCase() + pretty.slice(1);
}
