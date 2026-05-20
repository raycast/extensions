import { CardType, Flashcard, Option } from "../types";

/**
 * Parst die Markdown-Eingabe in eine Karteikarte.
 *
 * Standard-Karte:
 *   Frage
 *   ==
 *   Antwort
 *   #tag1 #tag2
 *
 * Multiple-Choice-Karte:
 *   Frage
 *   ==<
 *   1: Option A
 *   2: Option B
 *   3: Option C
 *   --
 *   correct: 2
 *   #tag1 #tag2
 *
 * Leerzeilen zwischen den Abschnitten sind optional.
 * Tags werden automatisch auf Kleinschreibung normalisiert.
 */
export function parseMarkdown(
  input: string,
): Omit<Flashcard, "id" | "progress" | "createdAt"> {
  const lines = input.trim().split("\n");

  // Tags aus der letzten Zeile extrahieren (wenn die Zeile nur aus #tags besteht)
  let tags: string[] = [];
  let contentLines = lines;

  const lastLine = lines[lines.length - 1]?.trim() ?? "";
  // Unicode-taugliches Regex: erkennt auch Umlaute, Akzente etc. in Tags
  if (/^(#[\p{L}\p{N}_]+\s*)+$/u.test(lastLine)) {
    tags = (lastLine.match(/#([\p{L}\p{N}_]+)/gu) ?? []).map((t) =>
      t.slice(1).toLowerCase(),
    );
    contentLines = lines.slice(0, -1);
  }

  const content = contentLines.join("\n").trim();

  // Typ erkennen anhand des Trennzeichens
  if (/\n[\t ]*==</.test(content)) {
    return parseMC(content, tags);
  } else {
    return parseStandard(content, tags);
  }
}

function parseStandard(
  content: string,
  tags: string[],
): Omit<Flashcard, "id" | "progress" | "createdAt"> {
  // Teilen an == – mit oder ohne Leerzeilen darum
  const parts = content.split(/\n[\t ]*==[\t ]*\n/);
  const front = parts[0]?.trim() ?? "";
  const back = parts[1]?.trim() ?? "";

  return {
    type: "standard" as CardType,
    front,
    back,
    tags,
  };
}

function parseMC(
  content: string,
  tags: string[],
): Omit<Flashcard, "id" | "progress" | "createdAt"> {
  // Teilen an ==< – mit oder ohne Leerzeilen darum
  const [frontPart, rest] = content.split(/\n[\t ]*==<[\t ]*\n/);
  const front = frontPart?.trim() ?? "";

  // Rest teilen an -- – mit oder ohne Leerzeilen darum
  const [optionsPart, correctPart] = (rest ?? "").split(/\n[\t ]*--[\t ]*\n/);

  // Optionen parsen: "1: Text", "2: Text", "3: Text"
  const options: Option[] = (optionsPart ?? "")
    .trim()
    .split("\n")
    .reduce<Option[]>((acc, line) => {
      const m = line.trim().match(/^(\d+):\s*(.+)/);
      if (m) {
        acc.push({ id: parseInt(m[1], 10), text: m[2].trim() });
      }
      return acc;
    }, []);

  // Richtige Antwort parsen: Unterstützt sprachenunabhängig verschiedene Schlüsselwörter für Abwärtskompatibilität
  const correctMatch = (correctPart ?? "")
    .trim()
    .match(
      /^(correct|true|richtig|correcto|正确|सही|правильно|صحيح|correto|doğru):\s*(\d+)/im,
    );
  const correctOption = correctMatch
    ? parseInt(correctMatch[2], 10)
    : undefined;

  return {
    type: "multiple-choice" as CardType,
    front,
    options,
    correctOption,
    tags,
  };
}

/**
 * Parst eine Markdown-Datei mit mehreren Karteikarten.
 *
 * Karten werden durch eine Zeile mit genau "---" getrennt.
 * Der Platzhalter "-" (= keine Tags) wird vor dem Parsen entfernt.
 * Leere Blöcke werden übersprungen.
 */
export function parseMultipleCards(
  input: string,
): Omit<Flashcard, "id" | "progress" | "createdAt">[] {
  // An --- Trennlinien aufteilen (nur wenn --- allein auf einer Zeile steht)
  const blocks = input.split(/\n[ \t]*---[ \t]*\n/);

  const results: Omit<Flashcard, "id" | "progress" | "createdAt">[] = [];

  for (const raw of blocks) {
    // Block bereinigen
    let block = raw.trim();
    if (!block) continue;

    // Platzhalter "-" als letzte Zeile entfernen (= "keine Tags")
    const lines = block.split("\n");
    const lastLine = lines[lines.length - 1]?.trim() ?? "";
    if (lastLine === "-") {
      block = lines.slice(0, -1).join("\n").trim();
    }

    // Leeren Block nach Bereinigung überspringen
    if (!block) continue;

    try {
      results.push(parseMarkdown(block));
    } catch {
      // Fehlerhafte Blöcke überspringen, damit der Rest importiert wird
    }
  }

  return results;
}
