export interface HeliumTabRef {
  heliumId: string;
  url: string;
  title: string;
}

export const FIELD_SEPARATOR = String.fromCharCode(31);
export const RECORD_SEPARATOR = String.fromCharCode(30);

export function parseHeliumTabs(raw: string): HeliumTabRef[] {
  if (!raw || raw.trim() === "" || raw.trim() === "not_running") return [];

  return raw
    .split(RECORD_SEPARATOR)
    .map((record) => record.split(FIELD_SEPARATOR))
    .filter((parts) => parts.length >= 2 && parts[0])
    .map(([heliumId, url, title = ""]) => ({ heliumId, url, title }));
}
