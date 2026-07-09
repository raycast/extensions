import type { ProsodyAnalysis, Word } from "../types";
import { SYM, toneArrow } from "./symbols";
import { alignColumns, type Col } from "./align";

const MAX_WIDTH = 42; // max display columns per stave; keeps marks aligned above words (no independent wrap)
const cpLen = (s: string): number => [...s].length;

interface RenderAnalysisOptions {
  includeTitle?: boolean;
  sectionHeadingLevel?: 2 | 3 | 4;
}

function formatWord(w: Word): string {
  if (w.stressed && w.stressIndex !== null) {
    return w.syllables
      .map((s, i) => (i === w.stressIndex ? s.toUpperCase() : s.toLowerCase()))
      .join(SYM.SYLLABLE_DOT);
  }
  return w.syllables.join(SYM.SYLLABLE_DOT).toLowerCase();
}

/** Returns ONLY the beat-bearing (stressed) syllable in uppercase, for the Rhythm block. */
function rhythmBeatSyllable(w: Word): string {
  if (w.stressIndex !== null) return w.syllables[w.stressIndex].toUpperCase();
  return w.syllables.join("").toUpperCase();
}

/**
 * Pack columns into width-bounded chunks and emit each chunk's mark line directly
 * above its word line (a "stave"), stacked vertically inside one code block. This
 * guarantees marks stay above their words even when the sentence is long — instead
 * of one giant line that Raycast soft-wraps independently from the line above it.
 */
function renderStaves(cols: Col[], gap = 2): string {
  const chunks: Col[][] = [];
  let cur: Col[] = [];
  let curW = 0;
  for (const c of cols) {
    const w = Math.max(cpLen(c.mark), cpLen(c.word));
    const add = (cur.length ? gap : 0) + w;
    if (cur.length && curW + add > MAX_WIDTH) {
      chunks.push(cur);
      cur = [];
      curW = 0;
    }
    cur.push(c);
    curW += (cur.length > 1 ? gap : 0) + w;
  }
  if (cur.length) chunks.push(cur);

  const lines: string[] = [];
  chunks.forEach((chunk, i) => {
    const { markLine, wordLine } = alignColumns(chunk, gap);
    if (i > 0) lines.push("");
    lines.push(markLine, wordLine);
  });
  return "```\n" + lines.join("\n") + "\n```";
}

export function renderAnalysis(
  a: ProsodyAnalysis,
  options: RenderAnalysisOptions = {},
): string {
  const includeTitle = options.includeTitle !== false;
  const subhead = "#".repeat(options.sectionHeadingLevel ?? 2);
  const intoCols: Col[] = [];
  a.thoughtGroups.forEach((g, gi) => {
    g.words.forEach((w) => {
      const base = w.stressed ? SYM.STRESS : SYM.WEAK;
      const mark = w.nuclear ? `${base} ${toneArrow(g.tone)}` : base;
      intoCols.push({ mark, word: formatWord(w) });
    });
    if (gi < a.thoughtGroups.length - 1)
      intoCols.push({ mark: "", word: SYM.GROUP });
  });

  const beatCols: Col[] = [];
  a.thoughtGroups.forEach((g, gi) => {
    g.words.forEach((w) => {
      beatCols.push({
        mark: w.stressed ? SYM.STRESS : SYM.WEAK,
        word: w.stressed ? rhythmBeatSyllable(w) : w.text.toLowerCase(),
      });
    });
    if (gi < a.thoughtGroups.length - 1)
      beatCols.push({ mark: "", word: SYM.GROUP });
  });

  const links: string[] = [];
  a.thoughtGroups.forEach((g) =>
    g.words.forEach((w, i) => {
      if (w.linkToNext && i < g.words.length - 1) {
        links.push(`${w.text}${SYM.LINK}${g.words[i + 1].text}`);
      }
    }),
  );

  const legend = `${SYM.STRESS} stressed   ${SYM.WEAK} unstressed   ${SYM.RISE}${SYM.FALL} rising/falling tone   ${SYM.GROUP} pause   ${SYM.LINK} linking`;

  const lines: string[] = [];
  if (includeTitle) lines.push("# 🗣️ How to say it");
  if (a.isGeneratedExample && a.sourceWord) {
    lines.push(`*Example sentence for **${a.sourceWord}**:*`);
  }
  lines.push(`> ${a.text}`);
  lines.push("");
  lines.push(`${subhead} Stress & Intonation`);
  lines.push(renderStaves(intoCols));
  lines.push(`*${legend}*`);
  lines.push(`\`${a.ipa}\``);
  if (links.length) lines.push(`*linking:* ${links.join("  ·  ")}`);
  lines.push("");
  lines.push(`${subhead} Rhythm`);
  lines.push(renderStaves(beatCols));
  if (a.notes) {
    lines.push("");
    lines.push(`> 💡 ${a.notes}`);
  }
  return lines.join("\n");
}
