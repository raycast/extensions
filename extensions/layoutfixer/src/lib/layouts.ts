import { LAYOUT_DATA } from "./layout-data";

export type Lang = "en" | "fa";
export type PersianLayout = "isiri2901" | "persian";

/** A keyboard layout as a two-way map between characters and physical keys. */
export class Layout {
  /** Physical key (index into LAYOUT_DATA, plus shift) for each character this layout types. */
  private readonly keys = new Map<string, { index: number; shift: boolean }>();

  constructor(
    readonly lang: Lang,
    private readonly normal: readonly string[],
    private readonly shifted: readonly string[],
  ) {
    // Unshifted keys win when a character appears more than once.
    for (const [chars, shift] of [
      [normal, false],
      [shifted, true],
    ] as const) {
      chars.forEach((ch, index) => {
        if (ch && !this.keys.has(ch)) this.keys.set(ch, { index, shift });
      });
    }
  }

  has(ch: string): boolean {
    return this.keys.has(ch);
  }

  /** The character `target` types on the key that types `ch` here. Unknown characters stay as they are. */
  translate(ch: string, target: Layout): string {
    const key = this.keys.get(ch);
    if (!key) return ch;
    return (key.shift ? target.shifted : target.normal)[key.index] || ch;
  }
}

export interface LayoutPair {
  en: Layout;
  fa: Layout;
}

export function layouts(persian: PersianLayout = "isiri2901"): LayoutPair {
  const fa = LAYOUT_DATA[persian];
  return {
    en: new Layout("en", LAYOUT_DATA.us.normal, LAYOUT_DATA.us.shift),
    fa: new Layout("fa", fa.normal, fa.shift),
  };
}

/** Retypes `text`, written on `from`, as if the same keys were pressed on `to`. */
export function convert(text: string, from: Layout, to: Layout): string {
  return Array.from(text, (ch) => from.translate(ch, to)).join("");
}

/** The language most of the letters in `text` are written in, or null if it has no letters. */
export function detectLang(text: string): Lang | null {
  const persian = text.match(/\p{Script=Arabic}/gu)?.length ?? 0;
  const latin = text.match(/\p{Script=Latin}/gu)?.length ?? 0;
  if (persian === 0 && latin === 0) return null;
  return persian > latin ? "fa" : "en";
}
