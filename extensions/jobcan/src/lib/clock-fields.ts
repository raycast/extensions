import { HTMLElement, parse } from "node-html-parser";

/**
 * Clock field types
 */
type ClockFieldType = "select" | "text" | "time";

/**
 * Clock field definition
 */
export interface ClockField {
  name: string;
  type: ClockFieldType;
  required: boolean;
  label: string;
  options?: Array<{ value: string; label: string }>; // For select fields
  defaultValue?: string;
}

/**
 * Field parser function type
 * Takes an HTMLElement and returns a ClockField or null if not applicable
 */
type FieldParser = (element: HTMLElement, root: HTMLElement) => ClockField | null;

/**
 * Field registry mapping field names to parsers
 */
const CLOCK_FIELD_REGISTRY: Map<string, FieldParser> = new Map();

/**
 * Register a new field parser
 * This allows contributors to easily add support for new fields
 */
function registerClockField(fieldName: string, parser: FieldParser): void {
  CLOCK_FIELD_REGISTRY.set(fieldName, parser);
}

/**
 * Parse group_id select field
 */
function parseGroupIdField(select: HTMLElement, root: HTMLElement): ClockField | null {
  const name = select.getAttribute("name");
  if (name !== "group_id") {
    return null;
  }

  const options: Array<{ value: string; label: string }> = [];
  const optionElements = select.querySelectorAll("option");
  for (const option of optionElements) {
    const value = option.getAttribute("value") || "";
    const label = option.text.trim();
    if (value && label) {
      options.push({ value, label });
    }
  }

  if (options.length === 0) {
    return null;
  }

  // Try to find label
  const label = findLabelForField(select, root) || "Clock-in/out Spot";

  return {
    name: "group_id",
    type: "select",
    required: true, // group_id is typically required
    label,
    options,
    defaultValue: options[0]?.value,
  };
}

/**
 * Parse notice text field
 */
function parseNoticeField(input: HTMLElement, root: HTMLElement): ClockField | null {
  const name = input.getAttribute("name");
  if (name !== "notice") {
    return null;
  }

  const label = findLabelForField(input, root) || "Notes";
  const required = input.hasAttribute("required") || input.getAttribute("required") === "required";

  return {
    name: "notice",
    type: "text",
    required: required || true, // Notes are typically required
    label,
  };
}

/**
 * Parse time input fields (clock in/out times)
 * These are typically input[type="text"] with time format
 */
function parseTimeField(input: HTMLElement, root: HTMLElement): ClockField | null {
  const name = input.getAttribute("name");
  if (!name || (!name.includes("time") && !name.includes("in") && !name.includes("out"))) {
    return null;
  }

  // Check if it's a time-related field by looking at surrounding context
  const label = findLabelForField(input, root);
  if (!label || (!label.toLowerCase().includes("time") && !label.toLowerCase().includes("clock"))) {
    return null;
  }

  const required = input.hasAttribute("required") || input.getAttribute("required") === "required";

  // Determine if it's clock in or clock out
  const isClockIn = name.toLowerCase().includes("in") || label.toLowerCase().includes("in");
  const isClockOut = name.toLowerCase().includes("out") || label.toLowerCase().includes("out");

  let fieldName: string;
  if (isClockIn) {
    fieldName = "clockInTime";
  } else if (isClockOut) {
    fieldName = "clockOutTime";
  } else {
    fieldName = name;
  }

  return {
    name: fieldName,
    type: "time",
    required: required || false,
    label: label || fieldName,
  };
}

/**
 * Generic parser for text inputs
 */
function parseTextField(input: HTMLElement, root: HTMLElement): ClockField | null {
  const name = input.getAttribute("name");
  if (!name) {
    return null;
  }

  // Skip if already handled by specific parsers
  if (name === "notice" || name === "token" || name === "client_id" || name === "employee_id") {
    return null;
  }

  // Skip hidden fields
  const type = input.getAttribute("type");
  if (type === "hidden") {
    return null;
  }

  const label = findLabelForField(input, root) || name;
  const required = input.hasAttribute("required") || input.getAttribute("required") === "required";

  return {
    name,
    type: "text",
    required,
    label,
  };
}

/**
 * Find label for a form field
 */
function findLabelForField(field: HTMLElement, root: HTMLElement): string | null {
  const id = field.getAttribute("id");
  if (id) {
    const label = root.querySelector(`label[for="${id}"]`);
    if (label) {
      return label.text.trim();
    }
  }

  // Try to find label as parent or sibling
  let current: HTMLElement | null = field.parentNode as HTMLElement | null;
  while (current) {
    const label = current.querySelector("label");
    if (label) {
      return label.text.trim();
    }
    current = current.parentNode as HTMLElement | null;
  }

  // Try to find by name in table headers
  const name = field.getAttribute("name");
  if (name) {
    const th = root.querySelector(`th:contains("${name}")`);
    if (th) {
      return th.text.trim();
    }
  }

  return null;
}

/**
 * Parse all clock fields from HTML
 */
export function parseClockFields(html: string): ClockField[] {
  const root = parse(html);

  const fields: ClockField[] = [];
  const processedNames = new Set<string>();

  // Parse select fields
  const selects = root.querySelectorAll("select");
  for (const select of selects) {
    const name = select.getAttribute("name");
    if (!name || processedNames.has(name)) {
      continue;
    }

    // Try registered parsers first
    const parser = CLOCK_FIELD_REGISTRY.get(name);
    if (parser) {
      const field = parser(select, root);
      if (field) {
        fields.push(field);
        processedNames.add(name);
        continue;
      }
    }

    // Try default group_id parser
    const groupIdField = parseGroupIdField(select, root);
    if (groupIdField) {
      fields.push(groupIdField);
      processedNames.add(name);
    }
  }

  // Parse input fields
  const inputs = root.querySelectorAll("input");
  for (const input of inputs) {
    const name = input.getAttribute("name");
    if (!name || processedNames.has(name)) {
      continue;
    }

    // Skip hidden/system fields
    const type = input.getAttribute("type");
    if (type === "hidden" || name === "token" || name === "client_id" || name === "employee_id") {
      continue;
    }

    // Try registered parsers first
    const parser = CLOCK_FIELD_REGISTRY.get(name);
    if (parser) {
      const field = parser(input, root);
      if (field) {
        fields.push(field);
        processedNames.add(name);
        continue;
      }
    }

    // Try specific parsers
    const noticeField = parseNoticeField(input, root);
    if (noticeField) {
      fields.push(noticeField);
      processedNames.add(name);
      continue;
    }

    const timeField = parseTimeField(input, root);
    if (timeField) {
      fields.push(timeField);
      processedNames.add(name);
      continue;
    }

    // Try generic text field parser
    const textField = parseTextField(input, root);
    if (textField) {
      fields.push(textField);
      processedNames.add(name);
    }
  }

  // Parse textarea fields
  const textareas = root.querySelectorAll("textarea");
  for (const textarea of textareas) {
    const name = textarea.getAttribute("name");
    if (!name || processedNames.has(name)) {
      continue;
    }

    const label = findLabelForField(textarea, root) || name;
    const required = textarea.hasAttribute("required") || textarea.getAttribute("required") === "required";

    fields.push({
      name,
      type: "text",
      required,
      label,
    });
    processedNames.add(name);
  }

  // Ensure clock in/out time fields are always present
  // These are required for the clock in/out feature
  const hasClockInTime = fields.some((f) => f.name === "clockInTime");
  const hasClockOutTime = fields.some((f) => f.name === "clockOutTime");

  if (!hasClockInTime) {
    fields.push({
      name: "clockInTime",
      type: "time",
      required: false,
      label: "Clock In Time",
      defaultValue: "10:00",
    });
  }

  if (!hasClockOutTime) {
    fields.push({
      name: "clockOutTime",
      type: "time",
      required: false,
      label: "Clock Out Time",
      defaultValue: "19:00",
    });
  }

  return fields;
}

/**
 * Generate a schema signature from fields for comparison
 * This creates a unique string that represents the field structure
 */
export function generateFieldSchema(fields: ClockField[]): string {
  // Sort fields by name for consistent schema generation
  const sortedFields = [...fields].sort((a, b) => a.name.localeCompare(b.name));

  const schema = sortedFields.map((field) => {
    const parts = [field.name, field.type, field.required ? "required" : "optional"];
    if (field.type === "select" && field.options) {
      parts.push(`options:${field.options.length}`);
    }
    return parts.join(":");
  });

  return schema.join("|");
}

// Register default parsers
registerClockField("group_id", parseGroupIdField);
registerClockField("notice", parseNoticeField);
