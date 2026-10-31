// fabric's token line (`--show-metadata`, printed only with `--stream`): a bracketed label, then
// input, output and total counts, `[Metadata] Input: 28 | Output: 3 | Total: 31`. The words are
// localized (`[Metadaten] Eingabe: 28 …`, `[元数据] 输入：28 …`); the digits never are (probed on fabric 1.4.518).
// Pure: no I/O, no @raycast imports.

export interface Tokens {
  input: number;
  output: number;
  total: number;
}

// fabric's exact shape, in every locale captured: `[label] word: N | word: N | word: N`, a colon
// (fullwidth in Chinese, spaced in French) before each count, ` | ` between, nothing after. Any
// looser and a stray stderr line with three numbers (`[auth] password: 4417 pin 9921 otp 300118`,
// `[warn] retry 1 of 3 after 5s`) would read as tokens, the last one winning (review, 2026-10-19).
// The background wrapper's awk uses the same shape (assets/fabric-bg.sh).
const COUNT = "[^0-9|\\n]*(?::|：) ?([0-9]+)";
const LINE = new RegExp(`^\\[[^\\]\\n]+\\] ${COUNT} \\| ${COUNT} \\| ${COUNT}$`, "gm");

/** The counts on the last token line (Anthropic prints two, the last is the run's), or undefined, never 0s. */
export function parseTokens(stderr: string): Tokens | undefined {
  const last = [...stderr.matchAll(LINE)].at(-1);
  if (!last) return undefined;
  const [input, output, total] = last.slice(1, 4).map(Number);
  return { input, output, total };
}

/** What the Tokens row reads: "28 in · 3 out · 31 total". */
export function tokensText(t: Tokens): string {
  const n = (x: number) => x.toLocaleString("en-US");
  return `${n(t.input)} in · ${n(t.output)} out · ${n(t.total)} total`;
}
