import { ReferenceRecord } from "./model";

export interface IndexedRecord {
  record: ReferenceRecord;
  searchableText: string;
}

export function buildSearchIndex(records: ReferenceRecord[]): IndexedRecord[] {
  return records.map((record) => ({
    record,
    searchableText: [
      record.collection,
      record.name,
      ...record.fields.flatMap((field) =>
        field.sensitive ? [field.label] : [field.label, ...field.values],
      ),
    ]
      .join("\n")
      .toLocaleLowerCase(),
  }));
}

export function searchRecords(index: IndexedRecord[], query: string): ReferenceRecord[] {
  const needle = query.trim().toLocaleLowerCase();
  if (!needle) return index.map(({ record }) => record);
  return index
    .filter(({ searchableText }) => searchableText.includes(needle))
    .map(({ record }) => record);
}
