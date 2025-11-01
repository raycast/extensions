/**
 * Useful references:
 * - https://www.typewolf.com/cheatsheet
 * - https://www.w3.org/wiki/Common_HTML_entities_used_for_typography
 */
export interface Character {
  label: string;
  value: string;
  html: string;
  example?: string;
  keywords?: string[];
  icons?: {
    light: string;
    dark: string;
  };
}

const quoteChars: Character[] = [
  {
    label: "Opening Double Quote",
    value: "“",
    keywords: ["Left"],
    example: "“To be or not to be.”",
    html: "&ldquo;",
    icons: {
      light: "opening-double-black.png",
      dark: "opening-double-white.png",
    },
  },
  {
    label: "Closing Double Quote",
    value: "”",
    keywords: ["Right"],
    example: "“To be or not to be.”",
    html: "&rdquo;",
    icons: {
      light: "closing-double-black.png",
      dark: "closing-double-white.png",
    },
  },
  {
    label: "Opening Single Quote",
    value: "‘",
    keywords: ["Left"],
    example: "‘Tis but a scratch.",
    html: "&lsquo;",
    icons: {
      light: "opening-single-black.png",
      dark: "opening-single-white.png",
    },
  },
  {
    label: "Closing Single Quote",
    value: "’",
    keywords: ["Apostrophe", "Right"],
    example: "It’s a great day.",
    html: "&rsquo;",
    icons: {
      light: "closing-single-black.png",
      dark: "closing-single-white.png",
    },
  },
];

const punctuationChars: Character[] = [
  {
    label: "Em Dash",
    value: "—",
    example: "The quick brown fox — not the lazy dog — jumped over the fence.",
    html: "&mdash;",
    keywords: ["Long"],
  },
  {
    label: "En Dash",
    value: "–",
    example: "New York–London at 3pm–4pm.",
    html: "&ndash;",
  },
  {
    label: "Figure Dash",
    value: "‒",
    keywords: ["Number", "Dash"],
    example: "(555) 123‒4567",
    html: "&#8210;",
  },
  {
    label: "Minus",
    value: "−",
    keywords: ["Minus"],
    example: "5 − 3 = 2",
    html: "&minus;",
  },
  {
    label: "Ellipsis",
    value: "…",
    keywords: ["dot", ".."],
    example: "Wait for it…",
    html: "&hellip;",
  },
  {
    label: "Vertical ellipsis",
    value: "︙",
    keywords: ["dot", ".."],
    example: "Menu︙",
    html: "&#x22ee;",
  },
  {
    label: "Non-breaking space",
    value: " ",
    html: "&nbsp;",
  },
];

const mathAndNumberChars: Character[] = [
  {
    label: "Plus/Minus",
    value: "±",
    example: "± 5",
    html: "&plusmn;",
  },
  {
    label: "Multiplication",
    value: "×",
    keywords: ["Multiply", "Times"],
    example: "3 × 4 = 12",
    html: "&times;",
  },
  {
    label: "Division",
    value: "÷",
    keywords: ["Divide"],
    example: "12 ÷ 4 = 3",
    html: "&divide;",
  },
  {
    label: "Less Than or Equal To",
    value: "≤",
    example: "x ≤ 10",
    html: "&le;",
  },
  {
    label: "Greater Than or Equal To",
    value: "≥",
    example: "x ≥ 5",
    html: "&ge;",
  },
  { label: "Not Equal To", value: "≠", example: "5 ≠ 6", html: "&ne;" },
  {
    label: "Approximately",
    value: "≈",
    keywords: ["almost"],
    example: "π ≈ 3.14",
    html: "&asymp;",
  },
  {
    label: "Degree",
    value: "°",
    keywords: ["temperature", "angle"],
    example: "90° angle",
    html: "&deg;",
  },
  {
    label: "Degree fahrenheit",
    value: "℉",
    keywords: ["temperature"],
    example: "90℉",
    html: "&#8457;",
  },
  {
    label: "Degree celsius",
    value: "℃",
    keywords: ["temperature"],
    example: "32℃",
    html: "&#8451;",
  },
  {
    label: "Numero",
    value: "№",
    keywords: ["number"],
    example: "№ 1",
    html: "&numero;",
  },
  { label: "Cents", value: "¢", example: "99¢", html: "&cent;" },
  {
    label: "Half",
    value: "½",
    keywords: ["1/2"],
    example: "½ cup of sugar",
    html: "&frac12;",
  },
  {
    label: "Third",
    value: "⅓",
    keywords: ["1/3"],
    example: "⅓ of the pie",
    html: "&frac13;",
  },
  {
    label: "Two thirds",
    value: "⅔",
    keywords: ["2/3"],
    example: "⅔ of the pie",
    html: "&frac23;",
  },
  {
    label: "Quarter",
    value: "¼",
    keywords: ["1/4"],
    example: "¼ cup of milk",
    html: "&frac14;",
  },
  {
    label: "Three quarters",
    value: "¾",
    keywords: ["3/4"],
    example: "¾ of the pizza",
    html: "&frac34;",
  },
  {
    label: "Prime",
    value: "′",
    keywords: ["Feet", "Minutes"],
    example: "The room measures 12′ × 15′",
    html: "&prime;",
  },
  {
    label: "Double Prime",
    value: "″",
    keywords: ["Inches", "Seconds"],
    example: "The screen is 24″ wide",
    html: "&Prime;",
  },
  {
    label: "Basis Point",
    value: "‱",
    keywords: ["bps", "bip", "bp"],
    example: "Conversion increased by 8‱",
    html: "&#8241;",
  },
];

const superscriptAndOrdinalChars: Character[] = [
  {
    label: "Superscript 1",
    value: "¹",
    example: "x¹",
    html: "&sup1;",
  },
  {
    label: "Superscript 2",
    value: "²",
    example: "x²",
    html: "&sup2;",
  },
  {
    label: "Superscript 3",
    value: "³",
    example: "x³",
    html: "&sup3;",
  },
  {
    label: "Superscript 4",
    value: "⁴",
    example: "x⁴",
    html: "&#8308;",
  },
  {
    label: "Superscript 5",
    value: "⁵",
    example: "x⁵",
    html: "&#8309;",
  },
  {
    label: "Superscript 6",
    value: "⁶",
    example: "x⁶",
    html: "&#8310;",
  },
  {
    label: "Superscript 7",
    value: "⁷",
    example: "x⁷",
    html: "&#8311;",
  },
  {
    label: "Superscript 8",
    value: "⁸",
    example: "x⁸",
    html: "&#8312;",
  },
  {
    label: "Superscript 9",
    value: "⁹",
    example: "x⁹",
    html: "&#8313;",
  },
  {
    label: "Superscript 0",
    value: "⁰",
    example: "x⁰",
    html: "&#8304;",
  },
  {
    label: "Feminine ordinal indicator",
    value: "ª",
    keywords: ["a"],
    html: "&ordf;",
  },
  {
    label: "Masculine ordinal indicator",
    value: "º",
    keywords: ["o", "neutral"],
    html: "&ordm;",
  },
];

const symbolChars: Character[] = [
  {
    label: "Section",
    value: "§",
    example: "See 29 USC § 794 (d)",
    html: "&sect;",
  },
  {
    label: "Dagger",
    value: "†",
    keywords: ["cross", "footnote"],
    example: "This is a footnote†",
    html: "&dagger;",
  },
  {
    label: "Double dagger",
    value: "‡",
    keywords: ["cross", "footnote"],
    example: "This is another footnote‡",
    html: "&Dagger;",
  },
  {
    label: "Ampersand",
    value: "&",
    keywords: ["and"],
    example: "Acme & Co",
    html: "&amp;",
  },
  {
    label: "Registered",
    value: "®",
    keywords: ["R", "Trademark"],
    example: "Acme®",
    html: "&reg;",
  },
  { label: "Copyright", value: "©", example: "© 2023 Acme", html: "&copy;" },
  {
    label: "Trademark",
    value: "™",
    keywords: ["tm"],
    example: "Acme™",
    html: "&trade;",
  },
];

const miscChars: Character[] = [
  {
    label: "Left arrow",
    value: "←",
    example: "Swipe ← to go back",
    html: "&larr;",
  },
  {
    label: "Right arrow",
    value: "→",
    example: "Swipe → to go forward",
    html: "&rarr;",
  },
  {
    label: "Up arrow",
    value: "↑",
    example: "Press ↑ to scroll up",
    html: "&uarr;",
  },
  {
    label: "Down arrow",
    value: "↓",
    example: "Press ↓ to scroll down",
    html: "&darr;",
  },
  {
    label: "Upper left arrow",
    value: "↖",
    example: "Swipe ↖ to access menu",
    html: "&nwarr;",
  },
  {
    label: "Upper right arrow",
    value: "↗",
    example: "Swipe ↗ to expand options",
    html: "&nearr;",
  },
  {
    label: "Lower left arrow",
    value: "↙",
    example: "Swipe ↙ to minimize options",
    html: "&swarr;",
  },
  {
    label: "Lower right arrow",
    value: "↘",
    example: "Swipe ↘ to access settings",
    html: "&searr;",
  },
  {
    label: "Bullet",
    value: "•",
    keywords: ["dot", "list", "point"],
    example: "• List item",
    html: "&bull;",
  },
  {
    label: "Triangluar bullet",
    value: "▸",
    keywords: ["arrow", "point", "list"],
    example: "▸ List item",
    html: "&#8227;",
  },
  {
    label: "Middle dot",
    value: "·",
    example: "First · Second",
    html: "&middot;",
  },
  {
    label: "Wavy dash",
    value: "〰",
    keywords: ["wave", "squiggle"],
    html: "&#x3030;",
  },
  {
    label: "Zero-width space",
    value: "​",
    html: "&#x200B;",
  },
];

const currencyChars: Character[] = [
  {
    label: "Dollar",
    value: "$",
    html: "&dollar;",
  },
  {
    label: "Euro",
    value: "€",
    html: "&euro;",
  },
  {
    label: "Pound",
    value: "£",
    html: "&pound;",
  },
  {
    label: "Yen",
    value: "¥",
    html: "&yen;",
  },
  {
    label: "Yuan",
    value: "元",
    html: "&#20803;",
  },
  {
    label: "Bitcoin",
    value: "₿",
    html: "&#x20BF;",
  },
  {
    label: "Cent",
    value: "¢",
    html: "&cent;",
  },
].map((char) => ({ ...char, keywords: ["money", "currency"] }));

export const characterSections: Array<{
  title: string;
  characters: Character[];
}> = [
  {
    title: "Quotes",
    characters: quoteChars,
  },
  {
    title: "Punctuation",
    characters: punctuationChars,
  },
  {
    title: "Math and Numbers",
    characters: mathAndNumberChars,
  },
  {
    title: "Superscript & Ordinal",
    characters: superscriptAndOrdinalChars,
  },
  {
    title: "Symbols",
    characters: symbolChars,
  },
  {
    title: "Currency",
    characters: currencyChars,
  },
  {
    title: "Miscellaneous",
    characters: miscChars,
  },
];
