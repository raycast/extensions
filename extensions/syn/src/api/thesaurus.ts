import * as cheerio from "cheerio";

export interface SynonymItem {
  term: string;
  similarity: string;
}

export interface Definition {
  definition: string;
  pos: string;
  synonyms: SynonymItem[];
  antonyms: SynonymItem[];
}

export async function fetchThesaurusData(word: string): Promise<Definition[]> {
  const url = `https://www.thesaurus.com/browse/${encodeURIComponent(word)}`;

  const response = await fetch(url);
  if (!response.ok) {
    if (response.status === 404) return [];
    throw new Error(`Failed to fetch data: ${response.statusText}`);
  }

  const html = await response.text();
  const $ = cheerio.load(html);
  const definitions: Definition[] = [];

  $(".definition-block").each((_, block) => {
    const header = $(block).find(".definition-header");
    const pos = header.find(".part-of-speech-label").text().trim() || "N/A";
    const definition = header.find(".definition").text().trim() || "N/A";

    const synonyms: SynonymItem[] = [];
    const antonyms: SynonymItem[] = [];

    $(block)
      .find(".synonym-antonym-panel")
      .each((_, panel) => {
        const label = $(panel).find(".synonym-antonym-panel-label").text().trim();
        const isSynonym = label.includes("Synonyms");
        const isAntonym = label.includes("Antonyms");
        if (!isSynonym && !isAntonym) return;

        $(panel)
          .find("a.word-chip")
          .each((_, chip) => {
            const term = $(chip).text().trim();
            const classes = $(chip).attr("class")?.split(/\s+/) || [];
            let similarity = "0";
            for (const cls of classes) {
              if (cls.startsWith("similarity-")) {
                similarity = cls.replace("similarity-", "");
                break;
              }
            }

            if (isSynonym) synonyms.push({ term, similarity });
            else if (isAntonym) antonyms.push({ term, similarity });
          });
      });

    definitions.push({ definition, pos, synonyms, antonyms });
  });

  return definitions;
}
