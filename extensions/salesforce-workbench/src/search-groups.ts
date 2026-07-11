import { SalesforceRecord, SearchObjectConfig } from "./types";

export interface SearchRecordGroup {
  apiName: string;
  objectLabel: string;
  sectionTitle: string;
  records: SalesforceRecord[];
}

const STANDARD_OBJECT_LABELS: Record<string, { singular: string; plural: string }> = {
  Account: { singular: "Account", plural: "Accounts" },
  Contact: { singular: "Contact", plural: "Contacts" },
  Lead: { singular: "Lead", plural: "Leads" },
  Opportunity: { singular: "Opportunity", plural: "Opportunities" },
  Case: { singular: "Case", plural: "Cases" },
};

export function objectLabels(apiName: string): { singular: string; plural: string } {
  const standard = STANDARD_OBJECT_LABELS[apiName];
  if (standard) return standard;
  if (!apiName || apiName === "Unknown") return { singular: "Unknown Object", plural: "Unknown Objects" };

  const normalized = apiName
    .replace(/__(?:c|x|mdt|e)$/i, "")
    .replace(/_/g, " ")
    .replace(/\b\w/g, (character) => character.toUpperCase());
  return { singular: normalized, plural: `${normalized} Records` };
}

export function groupSearchRecords(
  records: SalesforceRecord[],
  configuredObjects: SearchObjectConfig[],
): SearchRecordGroup[] {
  const configuredOrder = new Map(configuredObjects.map((config, index) => [config.apiName, index]));
  const grouped = new Map<string, SalesforceRecord[]>();

  for (const record of records) {
    const apiName = record.attributes?.type?.trim() || "Unknown";
    const current = grouped.get(apiName) ?? [];
    current.push(record);
    grouped.set(apiName, current);
  }

  return [...grouped.entries()]
    .sort(([left], [right]) => {
      const leftIndex = configuredOrder.get(left) ?? Number.MAX_SAFE_INTEGER;
      const rightIndex = configuredOrder.get(right) ?? Number.MAX_SAFE_INTEGER;
      return leftIndex - rightIndex || left.localeCompare(right);
    })
    .map(([apiName, groupRecords]) => {
      const labels = objectLabels(apiName);
      return {
        apiName,
        objectLabel: labels.singular,
        sectionTitle: labels.plural,
        records: groupRecords,
      };
    });
}
