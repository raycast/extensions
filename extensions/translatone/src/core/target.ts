import { LANGUAGES, type Language } from "./languages";

export type TranslationTarget =
  | { readonly kind: "pair"; readonly main: Language; readonly second: Language }
  | { readonly kind: "fixed"; readonly language: Language };

export interface Direction {
  readonly source: string;
  readonly target: string;
}

export interface TargetOption {
  readonly value: string;
  readonly title: string;
}

export interface TaggedReply {
  readonly text: string;
  readonly direction: Direction | undefined;
}

export const AUTO_TARGET = "auto";

const DIRECTION_TAG = /^\s*⟦\s*([A-Za-z-]+)\s*(?:→|->|>)\s*([A-Za-z-]+)\s*⟧\s*/;

const INCOMPLETE_TAG = /^\s*⟦[^⟧]*$/;

export function languagePair(main: Language, second: Language): TranslationTarget {
  return main.code === second.code
    ? { kind: "fixed", language: main }
    : { kind: "pair", main, second };
}

export function describeTarget(target: TranslationTarget): string {
  return target.kind === "pair"
    ? `Auto · ${target.main.name} ↔ ${target.second.name}`
    : `→ ${target.language.name}`;
}

export function targetOptions(defaultTarget: TranslationTarget): TargetOption[] {
  return [
    { value: AUTO_TARGET, title: describeTarget(defaultTarget) },
    ...LANGUAGES.map((language) => ({ value: language.code, title: `→ ${language.name}` })),
  ];
}

export function resolveTarget(
  value: string | undefined,
  defaultTarget: TranslationTarget,
): TranslationTarget {
  const language = LANGUAGES.find(({ code }) => code === value);
  return language ? { kind: "fixed", language } : defaultTarget;
}

export function targetInstruction(target: TranslationTarget): string {
  if (target.kind === "fixed") {
    return `Translate the user's text into ${target.language.name}.`;
  }
  return `Detect the language of the user's text. If it is ${target.main.name}, translate it into ${target.second.name}. Otherwise, translate it into ${target.main.name}.`;
}

export function directionTagInstruction(): string {
  const codes = LANGUAGES.map(({ code }) => code).join(", ");
  return `Start the reply with ⟦source→target⟧ using language codes (${codes}), for example ⟦id→en⟧, then a new line, then the translated text only, without quotes, notes, or explanations.`;
}

export function formatDirection(
  direction: Direction | undefined,
  requested: TranslationTarget,
): string {
  return direction ? `${direction.source} → ${direction.target}` : describeTarget(requested);
}

export function targetValue(target: TranslationTarget): string {
  return target.kind === "fixed" ? target.language.code : AUTO_TARGET;
}

export function swapTarget(
  direction: Direction | undefined,
  current: TranslationTarget,
): TranslationTarget {
  const source = LANGUAGES.find((language) => language.name === direction?.source);
  return source ? { kind: "fixed", language: source } : current;
}

export function parseDirectionTag(reply: string): TaggedReply {
  if (INCOMPLETE_TAG.test(reply)) {
    return { text: "", direction: undefined };
  }
  const match = DIRECTION_TAG.exec(reply);
  if (match?.[1] === undefined || match[2] === undefined) {
    return { text: reply, direction: undefined };
  }
  return {
    text: reply.slice(match[0].length),
    direction: { source: languageName(match[1]), target: languageName(match[2]) },
  };
}

function languageName(code: string): string {
  return LANGUAGES.find((language) => language.code === code)?.name ?? code.toUpperCase();
}
