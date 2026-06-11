import { readFile } from "node:fs/promises";

export const COLLECTION_IDS_KEY = "collectionIds";
export const COLLECTION_NAMES_KEY = "collectionNames";
export const COLLECTION_STATS_KEY = "collectionStats";

export interface CollectionStats {
  uniqueCards: number;
  totalCopies: number;
  foilCopies: number;
  setCount: number;
  totalRows: number;
  skippedNoId: number;
  skippedError: number;
}

function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (ch === "," && !inQuotes) {
      result.push(current);
      current = "";
    } else {
      current += ch;
    }
  }
  result.push(current);
  return result;
}

// Parses a ManaBox CSV and returns an array of Scryfall IDs.
export async function parseCollectionCSV(filePath: string): Promise<string[]> {
  const content = await readFile(filePath, "utf-8");
  const lines = content.split(/\r?\n/).filter(Boolean);
  if (lines.length < 2) throw new Error("CSV appears empty or has no data rows");

  const headers = parseCSVLine(lines[0]);
  const idCol = headers.indexOf("Scryfall ID");
  if (idCol === -1) throw new Error('Could not find "Scryfall ID" column — is this a ManaBox CSV?');

  const quantityCol = headers.indexOf("Quantity");

  const ids: string[] = [];
  for (let i = 1; i < lines.length; i++) {
    try {
      const cols = parseCSVLine(lines[i]);
      const id = cols[idCol]?.trim();
      if (!id) continue;
      const count = quantityCol !== -1 ? parseInt(cols[quantityCol] ?? "1", 10) : 1;
      const qty = isNaN(count) || count < 1 ? 1 : count;
      for (let q = 0; q < qty; q++) ids.push(id);
    } catch {
      // skip malformed rows
    }
  }

  if (ids.length === 0) throw new Error("No Scryfall IDs found in CSV");
  return ids;
}

// Parses a ManaBox CSV and returns Scryfall IDs plus collection stats.
export async function parseCollectionCSVWithStats(
  filePath: string
): Promise<{ ids: string[]; names: string[]; stats: CollectionStats }> {
  const content = await readFile(filePath, "utf-8");
  const lines = content.split(/\r?\n/).filter(Boolean);
  if (lines.length < 2) throw new Error("CSV appears empty or has no data rows");

  const headers = parseCSVLine(lines[0]);
  const idCol = headers.indexOf("Scryfall ID");
  if (idCol === -1) throw new Error('Could not find "Scryfall ID" column — is this a ManaBox CSV?');

  const countCol = headers.indexOf("Quantity");
  const foilCol = headers.indexOf("Foil");
  const editionCol = headers.indexOf("Set name");
  const nameCol = headers.indexOf("Name");

  const ids: string[] = [];
  const names = new Set<string>();
  let totalCopies = 0;
  let foilCopies = 0;
  let skippedNoId = 0;
  let skippedError = 0;
  const sets = new Set<string>();
  const totalRows = lines.length - 1;

  for (let i = 1; i < lines.length; i++) {
    try {
      const cols = parseCSVLine(lines[i]);
      const id = cols[idCol]?.trim();
      if (!id) {
        skippedNoId++;
        continue;
      }

      ids.push(id);

      if (nameCol !== -1) {
        const name = cols[nameCol]?.trim();
        if (name) names.add(name);
      }

      const count = countCol !== -1 ? parseInt(cols[countCol] ?? "1", 10) : 1;
      const qty = isNaN(count) || count < 1 ? 1 : count;
      totalCopies += qty;

      if (foilCol !== -1 && cols[foilCol]?.trim().toLowerCase() === "foil") {
        foilCopies += qty;
      }

      if (editionCol !== -1) {
        const edition = cols[editionCol]?.trim();
        if (edition) sets.add(edition);
      }
    } catch {
      skippedError++;
    }
  }

  if (ids.length === 0) throw new Error("No Scryfall IDs found in CSV");

  return {
    ids,
    names: [...names],
    stats: {
      uniqueCards: ids.length,
      totalCopies,
      foilCopies,
      setCount: sets.size,
      totalRows,
      skippedNoId,
      skippedError,
    },
  };
}
