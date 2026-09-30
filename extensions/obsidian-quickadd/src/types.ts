export interface Field {
  /** QuickAdd variable name (token spec before the first `|`, trimmed). */
  key: string;
  /** The same segment untrimmed; also sent when it differs from `key`. */
  rawKey: string;
  label: string;
  options?: string[];
  defaultValue?: string;
  optional: boolean;
}

export interface Choice {
  id: string;
  /** Exact QuickAdd name — what the URI selects by. */
  name: string;
  /** Display title; "Parent › Child" for choices nested in a Multi. */
  title: string;
  /** "Capture", "Template", "Macro", or whatever QuickAdd stores. */
  type: string;
  fields: Field[];
  /** Messages shown at the top of the form. */
  notes: string[];
  /** QuickAdd opens the resulting note (the choice's `openFile` setting). */
  openFile: boolean;
  /** Basic mode: QuickAdd will still ask something inside Obsidian. */
  promptsInObsidian: boolean;
}
