import { DocField, DocTypeItem, DocTypeMeta } from "../types";

export interface FieldGroup {
  title: string;
  fields: { fieldname: string; label: string; value: unknown }[];
}

/**
 * Groups document fields based on their metadata structure
 */
export const organizeFieldsByMeta = (document: DocTypeItem, meta: DocTypeMeta): FieldGroup[] => {
  const groups: FieldGroup[] = [];
  let currentGroup: FieldGroup | null = null;

  // Filter and sort fields by their index
  // Note: ERPNext uses 0/1 for boolean values, so check for falsy values (0, false, undefined, null)
  const visibleFields = meta.fields.filter((field) => !field.hidden).sort((a, b) => (a.idx || 0) - (b.idx || 0));

  for (const field of visibleFields) {
    // Handle section breaks - start new group
    if (field.fieldtype === "Section Break") {
      // Save current group if it has fields
      if (currentGroup && currentGroup.fields.length > 0) {
        groups.push(currentGroup);
      }
      // Start new group
      currentGroup = {
        title: field.label || "Details",
        fields: [],
      };
      continue;
    }

    // Handle tab breaks - treat as major section
    if (field.fieldtype === "Tab Break") {
      // Save current group if it has fields
      if (currentGroup && currentGroup.fields.length > 0) {
        groups.push(currentGroup);
      }
      // Start new group
      currentGroup = {
        title: field.label || "Information",
        fields: [],
      };
      continue;
    }

    // Skip column breaks and other layout fields
    if (["Column Break", "HTML", "Heading"].includes(field.fieldtype)) {
      continue;
    }

    // Check if field exists in document
    const value = document[field.fieldname];
    if (value === undefined) {
      continue;
    }

    // Skip empty values except for important fields
    if (!isImportantField(field) && isEmpty(value)) {
      continue;
    }

    // Add field to current group (create default group if none exists)
    if (!currentGroup) {
      currentGroup = {
        title: "General Information",
        fields: [],
      };
    }

    currentGroup.fields.push({
      fieldname: field.fieldname,
      label: field.label || field.fieldname,
      value: formatValue(value, field.fieldname),
    });
  }

  // Add the last group if it has fields
  if (currentGroup && currentGroup.fields.length > 0) {
    groups.push(currentGroup);
  }

  return groups;
};

/**
 * Gets metadata fields for the sidebar
 */
export const getMetadataFields = (document: DocTypeItem, meta: DocTypeMeta): Record<string, string> => {
  const metadataFieldNames = ["name", "docstatus", "status", "owner", "creation", "modified", "modified_by"];

  const metadata: Record<string, string> = {};

  for (const fieldname of metadataFieldNames) {
    const value = document[fieldname];
    if (value !== undefined && value !== null && value !== "") {
      const field = meta.fields.find((f) => f.fieldname === fieldname);
      const label = field?.label || fieldname.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase());
      metadata[label] = formatValue(value, fieldname);
    }
  }

  return metadata;
};

/**
 * Determines if a field is important enough to show even when empty
 */
const isImportantField = (field: DocField): boolean => {
  return !!(
    field.reqd ||
    field.bold ||
    field.in_list_view ||
    ["name", "title", "status", "docstatus"].includes(field.fieldname)
  );
};

/**
 * Checks if a value is considered empty
 */
const isEmpty = (value: unknown): boolean => {
  return value === null || value === undefined || value === "" || value === 0;
};

/**
 * Formats document status values for display
 */
const formatDocStatus = (status: number): string => {
  switch (status) {
    case 0:
      return "Draft";
    case 1:
      return "Submitted";
    case 2:
      return "Cancelled";
    default:
      return `Unknown (${status})`;
  }
};

/**
 * Formats values for display
 */
export const formatValue = (value: unknown, fieldname?: string): string => {
  if (value === null || value === undefined) return "—";
  if (typeof value === "boolean") return value ? "Yes" : "No";

  // Handle docstatus field specifically
  if (fieldname === "docstatus" && typeof value === "number") {
    return formatDocStatus(value);
  }

  if (typeof value === "object") return JSON.stringify(value, null, 2);

  // Handle datetime strings
  if (typeof value === "string" && value.includes("T") && value.includes(":")) {
    try {
      return new Date(value).toLocaleString();
    } catch {
      return value;
    }
  }

  return String(value);
};
