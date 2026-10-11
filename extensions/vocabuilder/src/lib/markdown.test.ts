import { describe, it, expect } from "vitest";
import {
  buildFlashcardDetailMarkdown,
  buildTranslationDetailMarkdown,
  buildTextTranslationDetailMarkdown,
} from "./markdown";

describe("buildTranslationDetailMarkdown", () => {
  const translation = {
    word: "hello",
    translation: "привіт",
    partOfSpeech: "interjection",
    example: "Привіт, як справи?",
    exampleTranslation: "Hello, how are you?",
  };

  it("shows the source-language sentence before the target-language one", () => {
    const md = buildTranslationDetailMarkdown(translation);
    expect(md).toContain("**Hello**, how are you?");
    expect(md.indexOf("**Hello**, how are you?")).toBeLessThan(md.indexOf("Привіт, як справи?"));
    expect(md).toContain("*Привіт, як справи?*");
  });

  it("bolds the looked-up word only in the source-language sentence", () => {
    const md = buildTranslationDetailMarkdown({
      ...translation,
      word: "state",
      example: "Викладіть свою позицію. State.",
      exampleTranslation: "Please state your position.",
    });
    expect(md).toContain("Please **state** your position\\.");
    expect(md).toContain("*Викладіть свою позицію\\. State\\.*");
  });

  it("matches the exact form case-insensitively and leaves longer tokens alone", () => {
    const md = buildTranslationDetailMarkdown({
      ...translation,
      word: "кіт",
      exampleTranslation: "Кіт спить, а кітч ні.",
    });
    expect(md).toContain("**Кіт** спить, а кітч ні\\.");
  });

  it("falls back to an inflected form when the exact word is absent", () => {
    const md = buildTranslationDetailMarkdown({
      ...translation,
      word: "cat",
      exampleTranslation: "Two cats sat on the mat.",
    });
    expect(md).toContain("Two **cats** sat on the mat\\.");
  });

  it("falls back to a substring match for scripts without word boundaries", () => {
    const md = buildTranslationDetailMarkdown({
      ...translation,
      word: "猫",
      exampleTranslation: "我喜欢猫。",
    });
    expect(md).toContain("我喜欢**猫**。");
  });

  it("bolds multi-word lookups and words containing regex metacharacters", () => {
    const phrase = buildTranslationDetailMarkdown({
      ...translation,
      word: "give up",
      exampleTranslation: "Never give up!",
    });
    expect(phrase).toContain("Never **give up**\\!");

    const symbols = buildTranslationDetailMarkdown({
      ...translation,
      word: "c++",
      exampleTranslation: "I write c++ daily.",
    });
    expect(symbols).toContain("I write **c\\+\\+** daily\\.");
  });

  it("leaves the sentence untouched when the word does not occur in it", () => {
    const md = buildTranslationDetailMarkdown({
      ...translation,
      word: "hello",
      exampleTranslation: "Good morning, everyone.",
    });
    expect(md).toContain("Good morning, everyone\\.");
    expect(md).not.toContain("**Good");
  });

  it("renders basic translation without correction note", () => {
    const md = buildTranslationDetailMarkdown(translation);
    expect(md.split("\n")[0]).toBe("# привіт");
    expect(md).toContain("> **hello** · interjection");
    expect(md).not.toContain("Corrected from");
  });

  it("shows correction note when input differs from word", () => {
    const md = buildTranslationDetailMarkdown(translation, "helo");
    expect(md).toContain('Corrected from "helo"');
  });

  it("does not show correction note when input matches word", () => {
    const md = buildTranslationDetailMarkdown(translation, "hello");
    expect(md).not.toContain("Corrected from");
  });

  it("escapes markdown special characters in word", () => {
    const t = { ...translation, word: "test|word*bold_under" };
    const md = buildTranslationDetailMarkdown(t);
    expect(md).toContain("\\|");
    expect(md).toContain("\\*");
    expect(md).toContain("\\_");
  });

  it("escapes HTML entities in translation", () => {
    const t = { ...translation, translation: "a < b & c > d" };
    const md = buildTranslationDetailMarkdown(t);
    expect(md).toContain("&lt;");
    expect(md).toContain("&gt;");
  });

  const rapture = {
    word: "rapture",
    translation: "захоплення",
    partOfSpeech: "noun",
    example: "Вона слухала його виступ із невимовним захопленням.",
    exampleTranslation: "She listened to his speech with unspoken rapture.",
  };

  const quotedLines = (md: string) => md.split("\n").filter((line) => line.startsWith(">"));
  const entryLine = (md: string) => quotedLines(md)[0]?.replace(/^> /, "").trimEnd();

  it("renders the full dictionary entry line under the gloss", () => {
    const md = buildTranslationDetailMarkdown({
      ...rapture,
      transcription: "ˈræptʃə(r)",
      forms: "pl. raptures",
      register: "literary" as const,
    });
    expect(md.split("\n")[0]).toBe("# захоплення");
    expect(entryLine(md)).toBe("**rapture** /ˈræptʃə\\(r\\)/ · noun · pl\\. raptures · *literary*");
  });

  it("keeps the part of speech alone on the line when no dictionary field is present", () => {
    const md = buildTranslationDetailMarkdown(rapture);
    expect(entryLine(md)).toBe("**rapture** · noun");
  });

  it("emits no dangling separator when only the transcription is present", () => {
    const md = buildTranslationDetailMarkdown({ ...rapture, transcription: "ˈræptʃə(r)" });
    expect(entryLine(md)).toBe("**rapture** /ˈræptʃə\\(r\\)/ · noun");
  });

  it("emits no dangling separator when only the forms are present", () => {
    const md = buildTranslationDetailMarkdown({ ...rapture, forms: "pl. raptures" });
    expect(entryLine(md)).toBe("**rapture** · noun · pl\\. raptures");
  });

  it("italicises the register so it reads apart from the grammatical segments", () => {
    const md = buildTranslationDetailMarkdown({ ...rapture, register: "literary" as const });
    expect(entryLine(md)).toBe("**rapture** · noun · *literary*");
  });

  it("treats blank dictionary fields as absent rather than as empty segments", () => {
    const md = buildTranslationDetailMarkdown({ ...rapture, transcription: "  ", forms: "" });
    expect(entryLine(md)).toBe("**rapture** · noun");
  });

  it("keeps a field carrying a newline on a single entry line", () => {
    const md = buildTranslationDetailMarkdown({ ...rapture, forms: "pl. raptures\n# not a heading" });
    expect(entryLine(md)).toBe("**rapture** · noun · pl\\. raptures \\# not a heading");
    expect(quotedLines(md)).toHaveLength(1);
  });

  it("escapes markdown metacharacters inside the entry line", () => {
    const md = buildTranslationDetailMarkdown({
      ...rapture,
      transcription: "*ræp*[x](y)",
      forms: "pl. _rap_ | **tures**",
    });
    const line = entryLine(md);
    expect(line).toBe("**rapture** /\\*ræp\\*\\[x\\]\\(y\\)/ · noun · pl\\. \\_rap\\_ \\| \\*\\*tures\\*\\*");
    expect(line).not.toContain("**tures**");
  });

  it("renders a bare entry line for a multi-word item with no dictionary fields", () => {
    const md = buildTranslationDetailMarkdown({
      word: "red herring",
      translation: "відволікаючий маневр",
      partOfSpeech: "idiom",
      example: "Ця деталь — просто відволікаючий маневр.",
      exampleTranslation: "That detail is just a red herring.",
    });
    expect(md.split("\n")[0]).toBe("# відволікаючий маневр");
    expect(quotedLines(md)).toEqual(["> **red herring** · idiom"]);
  });

  it("puts the correction note after the entry line and above the examples", () => {
    const md = buildTranslationDetailMarkdown({ ...rapture, transcription: "ˈræptʃə(r)" }, "raptcher");
    expect(md.indexOf("Corrected from")).toBeGreaterThan(md.indexOf("/ˈræptʃə"));
    expect(md.indexOf("Corrected from")).toBeLessThan(md.indexOf("She listened"));
  });

  // Both lines are apparatus about the entry rather than part of it. Separate
  // quote blocks would render as two stacked rules reading as unrelated asides,
  // so they share one block joined by a markdown hard break.
  it("keeps the grammar line and the correction note in a single quote block", () => {
    const md = buildTranslationDetailMarkdown({ ...rapture, forms: "pl. raptures" }, "raptcher");
    expect(md).toContain('> **rapture** · noun · pl\\. raptures  \n> *Corrected from "raptcher"*');
    expect(md.split("\n\n").filter((block) => block.startsWith(">"))).toHaveLength(1);
  });

  // The gloss is the only new information in the pane, so it takes the heading
  // and the source word — already visible in the search bar and the list — is
  // demoted into the quoted apparatus.
  it("makes the gloss the heading and demotes the source word into the quote", () => {
    const md = buildTranslationDetailMarkdown(rapture);
    expect(md.split("\n")[0]).toBe("# захоплення");
    expect(quotedLines(md)).toEqual(["> **rapture** · noun"]);
    expect(md).not.toContain("# rapture");
  });

  it("keeps the transcription delimited when the stored word is blank", () => {
    const md = buildTranslationDetailMarkdown({ ...rapture, word: "", transcription: "ˈræptʃə(r)" });
    expect(entryLine(md)).toBe("/ˈræptʃə\\(r\\)/ · noun");
  });

  // word and partOfSpeech are only bare strings on a stored row, so blank ones
  // are reachable from history; an empty "> " line renders as a stray rule.
  it("omits the quote block entirely when there is no apparatus to put in it", () => {
    const md = buildTranslationDetailMarkdown({ ...rapture, word: "", partOfSpeech: "" });
    expect(quotedLines(md)).toEqual([]);
    expect(md.split("\n")[0]).toBe("# захоплення");
  });

  it("drops the label above the examples and keeps them source-language first", () => {
    const md = buildTranslationDetailMarkdown(rapture);
    expect(md).not.toContain("**Example:**");
    expect(md.indexOf("**rapture**")).toBeLessThan(md.indexOf("захопленням"));
  });

  it("handles multiline example with line breaks", () => {
    const t = { ...translation, example: "Line one\nLine two" };
    const md = buildTranslationDetailMarkdown(t);
    // multiline escaping joins with markdown line break
    expect(md).toContain("  \n");
  });
});

describe("buildFlashcardDetailMarkdown", () => {
  it("shows the source-language sentence before the target-language one", () => {
    const md = buildFlashcardDetailMarkdown({
      word: "hello",
      translation: "привіт",
      partOfSpeech: "interjection",
      example: "Привіт, як справи?",
      exampleTranslation: "Hello, how are you?",
    });
    expect(md).toContain("**Hello**, how are you?");
    expect(md.indexOf("**Hello**, how are you?")).toBeLessThan(md.indexOf("Привіт, як справи?"));
    expect(md).toContain("*Привіт, як справи?*");
  });
});

describe("buildTextTranslationDetailMarkdown", () => {
  it("renders translation and original sections", () => {
    const md = buildTextTranslationDetailMarkdown("Hello world", "Привіт світ");
    expect(md).toContain("## Translation");
    expect(md).toContain("## Original");
    expect(md).toContain("Hello world");
    expect(md).toContain("Привіт світ");
  });

  it("escapes special chars in both sections", () => {
    const md = buildTextTranslationDetailMarkdown("a|b", "c*d");
    expect(md).toContain("a\\|b");
    expect(md).toContain("c\\*d");
  });
});
