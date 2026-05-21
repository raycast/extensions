export function normalizeChinesePunctuationText(text: string) {
  const punctuationMap: Record<string, string> = {
    ",": "，",
    ";": "；",
    ":": "：",
    "?": "？",
    "!": "！",
    ".": "。",
    "®": "。",
    "©": "。",
  };

  let normalized = "";

  for (let index = 0; index < text.length; index++) {
    const character = text[index];
    const normalizedPunctuation = punctuationMap[character];

    if (normalizedPunctuation && shouldUseChinesePunctuation(text, index, character)) {
      normalized = normalized.replace(/[ \t]+$/, "");
      normalized += normalizedPunctuation;

      while (/[ \t]/.test(text[index + 1] ?? "")) {
        index++;
      }

      continue;
    }

    normalized += character;
  }

  return normalizeChineseQuoteMarks(normalized);
}

function normalizeChineseQuoteMarks(text: string) {
  return text
    .split("\n")
    .map((line) => {
      let normalizedLine = line
        .replace(/(^|[\s，。！？：；、])\[\s*(?=[\u3400-\u9fff\uf900-\ufaff])/g, "$1「")
        .replace(/(?<=[\u3400-\u9fff\uf900-\ufaff])\s*\](?=$|[\s，。！？：；、])/g, "」");

      if (hasUnclosedChineseQuote(normalizedLine)) {
        normalizedLine = normalizedLine.replace(/(?<=[\u3400-\u9fff\uf900-\ufaff])\s*[1lI|](?=\s*$)/, "」");
      }

      return normalizedLine;
    })
    .join("\n");
}

function hasUnclosedChineseQuote(text: string) {
  return countMatches(text, /「/g) > countMatches(text, /」/g);
}

function countMatches(text: string, pattern: RegExp) {
  return text.match(pattern)?.length ?? 0;
}

function shouldUseChinesePunctuation(text: string, punctuationIndex: number, punctuation: string) {
  const previous = findNearbyTextCharacter(text, punctuationIndex, -1);
  const next = findNearbyTextCharacter(text, punctuationIndex, 1);

  if (punctuation === "." && isAsciiLetterOrDigit(previous) && isAsciiLetterOrDigit(next)) {
    return false;
  }

  if (punctuation === "." && (text[punctuationIndex - 1] === "." || text[punctuationIndex + 1] === ".")) {
    return false;
  }

  if (isCjkCharacter(previous) || isCjkCharacter(next)) {
    return true;
  }

  if (punctuation === "." && isAsciiLetter(previous) && !next) {
    return lineHasCjk(text, punctuationIndex);
  }

  if ((punctuation === "®" || punctuation === "©") && lineHasCjk(text, punctuationIndex)) {
    return true;
  }

  return false;
}

function findNearbyTextCharacter(text: string, punctuationIndex: number, direction: -1 | 1) {
  const ignoredCharacters = new Set([
    " ",
    "\t",
    "\r",
    "\n",
    '"',
    "'",
    "“",
    "”",
    "‘",
    "’",
    "「",
    "」",
    "『",
    "』",
    "(",
    ")",
    "[",
    "]",
    "{",
    "}",
    "（",
    "）",
  ]);

  for (let index = punctuationIndex + direction; index >= 0 && index < text.length; index += direction) {
    const character = text[index];

    if (!ignoredCharacters.has(character)) {
      return character;
    }
  }

  return "";
}

function lineHasCjk(text: string, punctuationIndex: number) {
  const lineStart = text.lastIndexOf("\n", punctuationIndex) + 1;
  const nextLineBreak = text.indexOf("\n", punctuationIndex);
  const lineEnd = nextLineBreak === -1 ? text.length : nextLineBreak;

  return /[\u3400-\u9fff\uf900-\ufaff]/.test(text.slice(lineStart, lineEnd));
}

function isCjkCharacter(character: string) {
  return /[\u3400-\u9fff\uf900-\ufaff]/.test(character);
}

function isAsciiLetter(character: string) {
  return /^[A-Za-z]$/.test(character);
}

function isAsciiLetterOrDigit(character: string) {
  return /^[A-Za-z0-9]$/.test(character);
}
