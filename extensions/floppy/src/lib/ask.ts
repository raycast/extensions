// Ask Floppy, answered by Raycast AI on the user's Raycast plan. Floppy's servers run no AI for it:
// this file picks the text files on the disk that match the question, reads them with the API,
// keeps the passages with the most matching words and hands those to AI.ask with numbered sources.
import { getDisk, readDiskFile, type DiskFile } from "./api";
import { diskEntries, isText, type DiskEntry } from "./disk";

const MAX_FILES = 10;
const MAX_FILE_BYTES = 256_000;
const PASSAGE_CHARS = 900;
const MAX_CONTEXT_CHARS = 14_000;

const STOP = new Set(
  "a an and are about as at be but by can did do does for from had has have how i in is it its me my of on or our so that the their them there these they this to was we were what when where which who why will with you your".split(
    " ",
  ),
);

export function words(text: string) {
  return [
    ...new Set(
      text
        .toLowerCase()
        .split(/[^\p{L}\p{N}]+/u)
        .filter((w) => w.length > 1 && !STOP.has(w)),
    ),
  ];
}

const score = (text: string, terms: string[]) => {
  const t = text.toLowerCase();
  return terms.reduce((n, w) => n + (t.includes(w) ? 1 : 0), 0);
};

export type Source = { n: number; key: string; name: string; path: string; url: string };
export type Prepared = { prompt: string; sources: Source[] };

type Candidate = { entry: DiskEntry; file: DiskFile; path: string };

export async function prepare(question: string): Promise<Prepared> {
  const terms = words(question);
  const entries = diskEntries(await getDisk());
  const candidates: Candidate[] = entries.flatMap((entry) =>
    entry.link.files
      .filter((f) => isText(f) && f.size > 0)
      .map((file) => ({
        entry,
        file,
        path: [...entry.folders, entry.link.files.length > 1 ? `${entry.name}/${file.path}` : entry.name].join("/"),
      })),
  );
  if (!candidates.length) throw new Error("There are no text files on your disk to read yet.");

  // The files whose names match the question first, then the most recently changed
  const ranked = candidates
    .map((c) => ({ c, s: score(c.path, terms) }))
    .sort((a, b) => b.s - a.s || b.c.file.updated_at.localeCompare(a.c.file.updated_at))
    .slice(0, MAX_FILES)
    .map((x) => x.c);

  const texts = await Promise.all(
    ranked.map((c) =>
      readDiskFile(c.file.id, MAX_FILE_BYTES).then(
        (text) => ({ c, text }),
        () => null,
      ),
    ),
  );

  const passages: { c: Candidate; text: string; s: number; at: number }[] = [];
  for (const t of texts) {
    if (!t) continue;
    const nameScore = score(t.c.path, terms);
    const chunks = t.text.split(/\n\s*\n/);
    let buf = "";
    let at = 0;
    const push = () => {
      if (buf.trim()) passages.push({ c: t.c, text: buf.trim(), s: score(buf, terms) + nameScore, at: at++ });
      buf = "";
    };
    for (const chunk of chunks) {
      if (buf.length + chunk.length > PASSAGE_CHARS) push();
      buf += (buf ? "\n\n" : "") + chunk.slice(0, PASSAGE_CHARS * 2);
    }
    push();
  }

  passages.sort((a, b) => b.s - a.s || a.at - b.at);
  const sources: Source[] = [];
  const blocks: string[] = [];
  let used = 0;
  const seen = new Set<string>();
  for (const p of passages) {
    if (used + p.text.length > MAX_CONTEXT_CHARS || seen.has(p.text)) continue;
    seen.add(p.text);
    let src = sources.find((s) => s.key === `${p.c.entry.link.id}/${p.c.file.id}`);
    if (!src) {
      src = {
        n: sources.length + 1,
        key: `${p.c.entry.link.id}/${p.c.file.id}`,
        name: p.c.entry.name,
        path: p.c.path,
        url: p.c.entry.link.url,
      };
      sources.push(src);
    }
    blocks.push(`[${src.n}] ${src.path}\n${p.text}`);
    used += p.text.length;
  }
  if (!blocks.length) throw new Error("Couldn't read any text files on your disk.");

  const prompt = `You answer questions about the user's files on Floppy, using only the passages below.
Cite the files you used as [1], [2] after the sentences they support, using the numbers given.
If the passages don't answer the question, say so in one sentence. Be brief and plain. Reply in the language of the question.

Passages:

${blocks.join("\n\n---\n\n")}

Question: ${question}`;
  return { prompt, sources };
}
