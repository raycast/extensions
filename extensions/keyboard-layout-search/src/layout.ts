export const LAYOUT_IDS = ["russian", "ukrainian", "french", "german", "greek"] as const;

export type LayoutId = (typeof LAYOUT_IDS)[number];
export type LayoutMode = "auto" | LayoutId;

export type LayoutDefinition = {
  id: LayoutId;
  title: string;
  keyboardName: string;
  map: ReadonlyMap<string, string>;
  scriptPattern?: RegExp;
  normalizeInput?: (text: string) => string;
};

type Row = {
  source: string;
  target: string;
  shiftedSource?: string;
  shiftedTarget?: string;
};

function createKeyMap(rows: Row[]): ReadonlyMap<string, string> {
  const entries: [string, string][] = [];

  for (const row of rows) {
    if (row.source.length !== row.target.length) {
      throw new Error(`Invalid keyboard row: “${row.source}” and “${row.target}” have different lengths.`);
    }

    entries.push(...Array.from(row.source, (character, index) => [character, row.target[index]] as [string, string]));

    if (row.shiftedSource && row.shiftedTarget) {
      if (row.shiftedSource.length !== row.shiftedTarget.length) {
        throw new Error(
          `Invalid shifted keyboard row: “${row.shiftedSource}” and “${row.shiftedTarget}” have different lengths.`,
        );
      }
      entries.push(
        ...Array.from(
          row.shiftedSource,
          (character, index) => [character, row.shiftedTarget?.[index] ?? character] as [string, string],
        ),
      );
    }
  }

  return new Map(entries);
}

const ENGLISH = {
  top: "`qwertyuiop[]",
  home: "asdfghjkl;'",
  bottom: "zxcvbnm,./",
  shiftedTop: "~QWERTYUIOP{}",
  shiftedHome: 'ASDFGHJKL:"',
  shiftedBottom: "ZXCVBNM<>?",
};

export const LAYOUTS: readonly LayoutDefinition[] = [
  {
    id: "russian",
    title: "Russian",
    keyboardName: "ЙЦУКЕН",
    scriptPattern: /[а-яё]/iu,
    map: createKeyMap([
      {
        source: "ёйцукенгшщзхъ",
        target: ENGLISH.top,
        shiftedSource: "ЁЙЦУКЕНГШЩЗХЪ",
        shiftedTarget: ENGLISH.shiftedTop,
      },
      {
        source: "фывапролджэ",
        target: ENGLISH.home,
        shiftedSource: "ФЫВАПРОЛДЖЭ",
        shiftedTarget: ENGLISH.shiftedHome,
      },
      {
        source: "ячсмитьбю.",
        target: ENGLISH.bottom,
        shiftedSource: "ЯЧСМИТЬБЮ,",
        shiftedTarget: ENGLISH.shiftedBottom,
      },
    ]),
  },
  {
    id: "ukrainian",
    title: "Ukrainian",
    keyboardName: "ЙЦУКЕН",
    scriptPattern: /[а-щьюяєіїґ]/iu,
    map: createKeyMap([
      {
        source: "ґйцукенгшщзхї",
        target: ENGLISH.top,
        shiftedSource: "ҐЙЦУКЕНГШЩЗХЇ",
        shiftedTarget: ENGLISH.shiftedTop,
      },
      {
        source: "фівапролджє",
        target: ENGLISH.home,
        shiftedSource: "ФІВАПРОЛДЖЄ",
        shiftedTarget: ENGLISH.shiftedHome,
      },
      {
        source: "ячсмитьбю.",
        target: ENGLISH.bottom,
        shiftedSource: "ЯЧСМИТЬБЮ,",
        shiftedTarget: ENGLISH.shiftedBottom,
      },
    ]),
  },
  {
    id: "french",
    title: "French",
    keyboardName: "AZERTY",
    map: createKeyMap([
      {
        source: "azertyuiop^$",
        target: "qwertyuiop[]",
        shiftedSource: "AZERTYUIOP¨£",
        shiftedTarget: "QWERTYUIOP{}",
      },
      {
        source: "qsdfghjklmù",
        target: ENGLISH.home,
        shiftedSource: "QSDFGHJKLM%",
        shiftedTarget: ENGLISH.shiftedHome,
      },
      {
        source: "wxcvbn,;:!",
        target: ENGLISH.bottom,
        shiftedSource: "WXCVBN?./§",
        shiftedTarget: ENGLISH.shiftedBottom,
      },
    ]),
  },
  {
    id: "german",
    title: "German",
    keyboardName: "QWERTZ",
    map: createKeyMap([
      {
        source: "qwertzuiopü+",
        target: "qwertyuiop[]",
        shiftedSource: "QWERTZUIOPÜ*",
        shiftedTarget: "QWERTYUIOP{}",
      },
      {
        source: "asdfghjklöä",
        target: ENGLISH.home,
        shiftedSource: "ASDFGHJKLÖÄ",
        shiftedTarget: ENGLISH.shiftedHome,
      },
      {
        source: "yxcvbnm,.-",
        target: ENGLISH.bottom,
        shiftedSource: "YXCVBNM;:_",
        shiftedTarget: ENGLISH.shiftedBottom,
      },
    ]),
  },
  {
    id: "greek",
    title: "Greek",
    keyboardName: "Ελληνικά",
    scriptPattern: /[\u0370-\u03ff]/u,
    normalizeInput: (text) => text.normalize("NFD").replace(/\p{M}/gu, ""),
    map: createKeyMap([
      {
        source: ";ςερτυθιοπ[]",
        target: "qwertyuiop[]",
        shiftedSource: ":ΣΕΡΤΥΘΙΟΠ{}",
        shiftedTarget: "QWERTYUIOP{}",
      },
      {
        source: "ασδφγηξκλ΄'",
        target: ENGLISH.home,
        shiftedSource: 'ΑΣΔΦΓΗΞΚΛ¨"',
        shiftedTarget: ENGLISH.shiftedHome,
      },
      {
        source: "ζχψωβνμ,./",
        target: ENGLISH.bottom,
        shiftedSource: "ΖΧΨΩΒΝΜ<>?",
        shiftedTarget: ENGLISH.shiftedBottom,
      },
    ]),
  },
];

export function getLayout(layoutId: LayoutId): LayoutDefinition {
  const layout = LAYOUTS.find((candidate) => candidate.id === layoutId);
  if (!layout) throw new Error(`Unknown keyboard layout: ${layoutId}`);
  return layout;
}

export type Conversion = {
  text: string;
  changedCharacters: number;
};

export function convertToEnglish(text: string, layout: LayoutDefinition): Conversion {
  let changedCharacters = 0;
  const normalizedText = layout.normalizeInput?.(text) ?? text;
  const convertedText = Array.from(normalizedText, (character) => {
    const convertedCharacter = layout.map.get(character) ?? character;
    if (convertedCharacter !== character) changedCharacters += 1;
    return convertedCharacter;
  }).join("");

  return { text: convertedText, changedCharacters };
}
