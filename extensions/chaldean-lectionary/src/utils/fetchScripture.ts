export async function fetchScripture(citation: string): Promise<string> {
  try {
    const parsed = parseCitation(citation);
    const slug = bookToSlug(parsed.book);

    if (parsed.endChapter !== parsed.startChapter) {
      const html1 = await fetchChapter(slug, parsed.startChapter);
      const html2 = await fetchChapter(slug, parsed.endChapter);
      const part1 = getScriptureText(html1, parsed.startVerse, 999);
      const part2 = getScriptureText(html2, 1, parsed.endVerse);
      return `${part1}\n\n${part2}`.trim();
    }

    const html = await fetchChapter(slug, parsed.startChapter);
    return getScriptureText(html, parsed.startVerse, parsed.endVerse);
  } catch (error) {
    return `Error: ${String(error)}`;
  }
}

async function fetchChapter(slug: string, chapter: number): Promise<string> {
  const url = `https://bible.usccb.org/bible/${slug}/${chapter}`;
  const response = await fetch(url);
  return response.text();
}

function getScriptureText(html: string, startVerse: number, endVerse: number): string {
  // The USCCB page has a consistent structure:
  // The scripture content lives inside <div class="field-items"> or similar
  // Most reliably: find "### CHAPTER" in the rendered markdown

  // Step 1: Find the scripture block by looking for the chapter heading tag
  // USCCB uses <h3> for chapter headings
  const h3Match = html.match(/<h3[^>]*>([\s\S]*?)<\/h3>/i);
  let startIdx = h3Match ? html.indexOf(h3Match[0]) : -1;

  // Fallback: find the first verse number in a paragraph
  if (startIdx === -1) {
    const verseMatch = html.match(/<p[^>]*>\s*<sup>\s*1\s*<\/sup>/i);
    startIdx = verseMatch ? html.indexOf(verseMatch[0]) : 0;
  }

  // Step 2: Find where footnotes begin
  // USCCB footnotes are in a specific section
  const footnoteMarkers = [
    '<div class="view-content">',
    'class="footnotes"',
    'id="footnotes"',
    "Copyright 2019",
  ];
  let endIdx = html.length;
  for (const marker of footnoteMarkers) {
    const idx = html.indexOf(marker, startIdx + 100);
    if (idx !== -1 && idx < endIdx) endIdx = idx;
  }

  let content = html.substring(startIdx, endIdx);

  // Step 3: Strip HTML carefully
  // First fix LORD (small caps) at HTML level
  content = content
    .replace(/<span[^>]*class="[^"]*small-caps[^"]*"[^>]*>ord<\/span>/gi, "ORD")
    .replace(/<span[^>]*>ord<\/span>/gi, "ORD")
    .replace(/<sup[^>]*>[\s\S]*?<\/sup>/gi, "") // remove superscript footnote markers
    .replace(/<\/p>/gi, "\n\n")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&rsquo;/g, "\u2019")
    .replace(/&lsquo;/g, "\u2018")
    .replace(/&ldquo;/g, "\u201C")
    .replace(/&rdquo;/g, "\u201D")
    .replace(/&[a-z]+;/g, "")
    .replace(/&#\d+;/g, "")
    // Remove ALL non-standard characters including image placeholder
    .replace(/[^\x0A\x0D\x20-\x7E\u2018\u2019\u201C\u201D\u2014\u2013]/g, "")
    .replace(/[ \t]+/g, " ")
    .replace(/\n /g, "\n")
    .trim();

  // Step 4: Cut at footnote patterns in plain text
  const footnoteCutoffs = [
    /\n\s*\*\s*\[/,           // * [9:1]
    /\n\s*\[\s*\d+:\d+/,      // [9:1]
    /\na\.\s*\[/,              // a. [
    /\nCopyright/,
    /\nDive into/,
  ];
  for (const pattern of footnoteCutoffs) {
    const match = pattern.exec(content);
    if (match) content = content.substring(0, match.index);
  }

 // Step 5: Find start verse
  if (startVerse > 1) {
    const re = new RegExp(`(?:^|\\n| )${startVerse}(?= |[A-Z"\u201C])`);
    const match = re.exec(content);
    if (match) {
      content = content.substring(match.index + match[0].length);
      content = content.replace(/^\d+ /, "");
    }
  }

 // Step 6: Find end verse
  if (endVerse < 999) {
    // Match verse number whether it has a space or not before next word
    const re = new RegExp(`(?:^|\\n| )${endVerse + 1}(?= |[A-Z"\u201C])`);
    const match = re.exec(content);
    if (match) content = content.substring(0, match.index);
  }

 // Step 7: Final cleanup
  content = content
    // Remove CHAPTER heading
    .replace(/CHAPTER\s+\d+\s*/g, "")
    // Remove verse numbers attached directly to words like "1The" or "26But"
    .replace(/\b(\d+)([A-Z][a-z])/g, "$2")
    .replace(/\b(\d+)([a-z][a-z])/g, "$2")
    .replace(/\b(\d+)(["'\u201C\u2018])/g, "$2")
    // Remove verse numbers with space after like "23 The"
    .replace(/(?:^|\n| )\d+ (?=[A-Z"\u201C])/g, " ")
    // Fix LORD
    .replace(/\bL ORD\b/g, "LORD")
    .replace(/\bL\s+ORD\b/g, "LORD")
    // Remove inline footnote letters after punctuation
    .replace(/([.!?,;:"\u201D]) [a-z] (?=[A-Z"\u201C])/g, "$1 ")
    .replace(/([.!?,;:"\u201D])[a-z](?= )/g, "$1")
    // Remove section headings
    .replace(/^[A-Z][a-zA-Z ,]+\.\s*$/gm, "")
    // Remove image placeholder
    .replace(/[^\x0A\x0D\x20-\x7E\u2018\u2019\u201C\u201D\u2014\u2013]/g, "")
    // Remove asterisks
    .replace(/\*/g, "")
    // Clean whitespace
    .replace(/\n{3,}/g, "\n\n")
    .replace(/[ \t]{2,}/g, " ")
    .trim();

  return content;
}

interface ParsedCitation {
  book: string;
  startChapter: number;
  startVerse: number;
  endChapter: number;
  endVerse: number;
}

function parseCitation(citation: string): ParsedCitation {
  const multiChapter = citation.match(/^(.+?)\s+(\d+):(\d+)-(\d+):(\d+)/);
  if (multiChapter) {
    return {
      book: multiChapter[1].trim(),
      startChapter: parseInt(multiChapter[2]),
      startVerse: parseInt(multiChapter[3]),
      endChapter: parseInt(multiChapter[4]),
      endVerse: parseInt(multiChapter[5]),
    };
  }
  const singleChapter = citation.match(/^(.+?)\s+(\d+):(\d+)-(\d+)/);
  if (singleChapter) {
    return {
      book: singleChapter[1].trim(),
      startChapter: parseInt(singleChapter[2]),
      startVerse: parseInt(singleChapter[3]),
      endChapter: parseInt(singleChapter[2]),
      endVerse: parseInt(singleChapter[4]),
    };
  }
  const singleVerse = citation.match(/^(.+?)\s+(\d+):(\d+)/);
  if (singleVerse) {
    return {
      book: singleVerse[1].trim(),
      startChapter: parseInt(singleVerse[2]),
      startVerse: parseInt(singleVerse[3]),
      endChapter: parseInt(singleVerse[2]),
      endVerse: 999,
    };
  }
  return { book: citation, startChapter: 1, startVerse: 1, endChapter: 1, endVerse: 999 };
}

function bookToSlug(book: string): string {
  const map: Record<string, string> = {
    Genesis: "genesis", Exodus: "exodus", Leviticus: "leviticus",
    Numbers: "numbers", Deuteronomy: "deuteronomy", Joshua: "joshua",
    Judges: "judges", Ruth: "ruth", "1 Samuel": "1samuel",
    "2 Samuel": "2samuel", "1 Kings": "1kings", "2 Kings": "2kings",
    "1 Chronicles": "1chronicles", "2 Chronicles": "2chronicles",
    Ezra: "ezra", Nehemiah: "nehemiah", Tobit: "tobit", Judith: "judith",
    Esther: "esther", "1 Maccabees": "1maccabees", "2 Maccabees": "2maccabees",
    Job: "job", Psalms: "psalms", Psalm: "psalms", Proverbs: "proverbs",
    Ecclesiastes: "ecclesiastes", "Song of Songs": "songofsolomon",
    Wisdom: "wisdom", Sirach: "sirach", Isaiah: "isaiah",
    Jeremiah: "jeremiah", Lamentations: "lamentations", Baruch: "baruch",
    Ezekiel: "ezekiel", Daniel: "daniel", Hosea: "hosea", Joel: "joel",
    Amos: "amos", Obadiah: "obadiah", Jonah: "jonah", Micah: "micah",
    Nahum: "nahum", Habakkuk: "habakkuk", Zephaniah: "zephaniah",
    Haggai: "haggai", Zechariah: "zechariah", Malachi: "malachi",
    Matthew: "matthew", Mark: "mark", Luke: "luke", John: "john",
    Acts: "acts", Romans: "romans", "1 Corinthians": "1corinthians",
    "2 Corinthians": "2corinthians", Galatians: "galatians",
    Ephesians: "ephesians", Philippians: "philippians",
    Colossians: "colossians", "1 Thessalonians": "1thessalonians",
    "2 Thessalonians": "2thessalonians", "1 Timothy": "1timothy",
    "2 Timothy": "2timothy", Titus: "titus", Philemon: "philemon",
    Hebrews: "hebrews", James: "james", "1 Peter": "1peter",
    "2 Peter": "2peter", "1 John": "1john", "2 John": "2john",
    "3 John": "3john", Jude: "jude", Revelation: "revelation",
  };
  return map[book] || book.toLowerCase().replace(/\s+/g, "");
}