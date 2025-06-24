import { Icon, Color } from "@raycast/api";

export interface SearchResult {
  value: string;
  label?: string;
  description: string;
  doctype?: string;
  name?: string;
  title?: string;
  content?: string;
  [key: string]: string | number | boolean | undefined;
}

/**
 * Extracts DocType from description string that follows format "DocType: content"
 */
export const getDocTypeFromDescription = (description: string): string => {
  const match = description.match(/^([^:]+):/);
  return match ? match[1].trim() : "Unknown";
};

/**
 * Determines the DocType of a search result using multiple fallback strategies
 */
export const getDocTypeFromResult = (result: SearchResult): string => {
  // Priority 1: Direct doctype field
  if (result.doctype && typeof result.doctype === "string" && result.doctype.trim()) {
    return result.doctype.trim();
  }

  // Priority 2: Extract from description
  if (result.description && typeof result.description === "string") {
    const extractedDocType = getDocTypeFromDescription(result.description);
    if (extractedDocType !== "Unknown") {
      return extractedDocType;
    }
  }

  // Priority 3: Check alternative field names
  const possibleDocTypeFields = ["dt", "document_type", "type"];
  for (const field of possibleDocTypeFields) {
    if (result[field] && typeof result[field] === "string" && result[field] !== "") {
      return String(result[field]).trim();
    }
  }

  return "Document";
};

/**
 * Gets the document name from a search result using field priority
 */
export const getDocumentName = (result: SearchResult): string => {
  const fields = ["name", "value", "title"];

  for (const field of fields) {
    if (result[field] && typeof result[field] === "string" && result[field].trim()) {
      return String(result[field]).trim();
    }
  }

  return "Unknown Document";
};

/**
 * Gets the display label for a search result
 */
export const getDisplayLabel = (result: SearchResult): string => {
  const fields = ["label", "title"];

  for (const field of fields) {
    if (result[field] && typeof result[field] === "string" && result[field].trim()) {
      return String(result[field]).trim();
    }
  }

  return getDocumentName(result);
};

/**
 * Returns appropriate icon and color for a given DocType
 */
export const getIconForResult = (result: SearchResult): { source: Icon; tintColor: Color } => {
  const doctype = getDocTypeFromResult(result);

  const iconMap: Record<string, { source: Icon; tintColor: Color }> = {
    // 📊 Accounting (Money-focused: green)
    "Journal Entry": { source: Icon.BankNote, tintColor: Color.Green },
    "Payment Entry": { source: Icon.Coins, tintColor: Color.Green },
    "GL Entry": { source: Icon.Book, tintColor: Color.Green },
    "Bank Reconciliation": { source: Icon.Building, tintColor: Color.Green },
    Account: { source: Icon.Folder, tintColor: Color.Green },

    // 🛒 Buying (Supplier relationship: purple)
    "Purchase Order": { source: Icon.Document, tintColor: Color.Purple },
    "Purchase Invoice": { source: Icon.Receipt, tintColor: Color.Purple },
    Supplier: { source: Icon.Building, tintColor: Color.Purple },
    "Purchase Receipt": { source: Icon.Tray, tintColor: Color.Purple },

    // 🛍️ Selling (Customer: blue)
    "Sales Order": { source: Icon.Document, tintColor: Color.Blue },
    "Sales Invoice": { source: Icon.Receipt, tintColor: Color.Blue },
    Customer: { source: Icon.Person, tintColor: Color.Blue },
    Quotation: { source: Icon.Document, tintColor: Color.Blue },

    // 📦 Stock & Manufacturing (Inventory: orange)
    "Delivery Note": { source: Icon.Box, tintColor: Color.Orange },
    "Stock Entry": { source: Icon.ArrowClockwise, tintColor: Color.Orange },
    "Work Order": { source: Icon.Hammer, tintColor: Color.Orange },
    "Bill of Materials": { source: Icon.Clipboard, tintColor: Color.Orange },
    Item: { source: Icon.Box, tintColor: Color.Orange },
    Warehouse: { source: Icon.Building, tintColor: Color.Orange },
    "Material Request": { source: Icon.Document, tintColor: Color.Orange },

    // 🧩 CRM & Projects (Engagement: blue/cyan)
    Lead: { source: Icon.SpeechBubble, tintColor: Color.Blue },
    Opportunity: { source: Icon.BullsEye, tintColor: Color.Blue },
    Project: { source: Icon.Folder, tintColor: Color.SecondaryText },
    Task: { source: Icon.CheckCircle, tintColor: Color.SecondaryText },
    ToDo: { source: Icon.Check, tintColor: Color.Purple },

    // 👥 HR & Employee Management (People: green)
    Employee: { source: Icon.Person, tintColor: Color.Green },
    "Leave Application": { source: Icon.Calendar, tintColor: Color.Green },
    "Salary Slip": { source: Icon.BankNote, tintColor: Color.Green },
    Attendance: { source: Icon.Clock, tintColor: Color.Green },

    // 🛠️ Support, Assets, Quality, Others (Neutral colors)
    Issue: { source: Icon.Bug, tintColor: Color.SecondaryText },
    Asset: { source: Icon.Tag, tintColor: Color.SecondaryText },
    "Quality Inspection": { source: Icon.MagnifyingGlass, tintColor: Color.SecondaryText },
    Contact: { source: Icon.Person, tintColor: Color.SecondaryText },

    // 🔧 System & Configuration (Red/system colors)
    DocType: { source: Icon.Cog, tintColor: Color.Red },
    User: { source: Icon.Person, tintColor: Color.Red },
    Role: { source: Icon.Shield, tintColor: Color.Red },
    "Print Format": { source: Icon.Document, tintColor: Color.Red },
    "Custom Field": { source: Icon.Plus, tintColor: Color.Red },
  };

  return iconMap[doctype] || { source: Icon.Document, tintColor: Color.Blue };
};
