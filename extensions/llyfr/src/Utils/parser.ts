import Path from "node:path";
import { readFile } from "node:fs/promises";

import { parse, Entry, Creator } from "@retorquere/bibtex-parser";

import { ILocalEntry } from "./types";

const journalLookup: { [key: string]: string } = {
  "The Astrophysical Journal": "ApJ",
  "Astrophysical Journal": "ApJ",
  "Astrophysical Journal Letters": "ApJL",
  "Astrophysical Journal Supplement": "ApJS",
  "Monthly Notices of the Royal Astronomical Society": "MNRAS",
  "Astronomy & Astrophysics": "A&A",
  "The Astronomical Journal": "AJ",
  "Astrophysical Journal: Supplement": "ApJS",
  "Physical Review Letters": "PRL",
  "Physical Review Research": "PRR",
  "Physical Review D": "PRD",
  "Physical Review C": "PRC",
  "Physical Review X": "PRX",
  "Journal of Plasma Physics": "JPP",
  "Annual Review of Astronomy and Astrophysics": "ARAA",
  "Space Science Reviews": "SSR",
  "Reviews of Modern Physics": "Rev. Mod. Phys.",
  "Computer Physics Communications": "Comp. Phys. Comm.",
  "arXiv e-prints": "arXiv",
  "\\nat": "Nature",
};

const extractName = (nameDict: { lastName?: string; name?: string }): string => {
  if (nameDict.name) {
    return nameDict.name;
  }
  return nameDict.lastName || "";
};

const extractType = (typeStr?: string): "paper" | "book" | "thesis" | "misc" => {
  if (typeStr === undefined) {
    return "misc";
  } else if (typeStr === "article") {
    return "paper";
  } else if (typeStr.includes("book")) {
    return "book";
  } else if (typeStr.includes("thesis")) {
    return "thesis";
  }
  return "misc";
};

const extractJournal = (journalStr?: string): string | undefined => {
  return journalStr ? journalLookup[journalStr] || journalStr : undefined;
};

const parsed2Entry = (parsed: Entry): ILocalEntry => {
  return {
    title: parsed.fields.title || "No Title",
    authors: parsed.fields.author?.map((a: Creator) => extractName(a)) || [],
    type: extractType(parsed.type),
    year: parsed.fields.year ? parseInt(parsed.fields.year) : 0,
    bibtex: parsed.input,
    journal: extractJournal(parsed.fields.journal),
    file: parsed.fields.file ? parsed.fields.file.split(":")[1] : undefined,
    url: parsed.fields.url || parsed.fields.adsurl || undefined,
    abstract: parsed.fields.abstract || undefined,
  };
};

export async function ParseBibTex(bibfile: string): Promise<ILocalEntry[]> {
  return readFile(Path.join(bibfile), "utf8").then((data) =>
    parse(data)
      .entries.map((entry) => parsed2Entry(entry))
      .sort((a, b) => a.title.localeCompare(b.title)),
  );
}
