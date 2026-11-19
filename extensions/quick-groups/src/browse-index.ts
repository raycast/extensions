import { ReferenceField, ReferenceRecord } from "./model";

export interface FieldOccurrence {
  field: ReferenceField;
  record: ReferenceRecord;
}

export interface FieldGroup {
  label: string;
  occurrences: FieldOccurrence[];
}

export function groupFields(records: ReferenceRecord[]): FieldGroup[] {
  const groups = new Map<string, FieldGroup>();
  for (const record of records) {
    for (const field of record.fields) {
      const group = groups.get(field.label) ?? { label: field.label, occurrences: [] };
      group.occurrences.push({ field, record });
      groups.set(field.label, group);
    }
  }
  return [...groups.values()].sort((a, b) => a.label.localeCompare(b.label));
}
