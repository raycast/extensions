export type Status = "present" | "clocked_out" | "no_show";
export interface Template {
  id: string;
  label: string;
  /** Existing body is the Template Table; retained for stored-data compatibility. */
  body: string;
  heading?: string;
  notes?: string;
  defaultTimeIn?: string;
}
export interface Entry {
  id: string;
  login: string;
  name: string;
  /** Canonical h:mm A, or empty when unset. */
  timeIn: string;
  timeOut: string;
  status: Status;
  templateId: string;
  templateBody: string;
  templateHeading?: string;
  templateNotes?: string;
}
export interface Store {
  version: 1;
  templates: Template[];
  selectedTemplateId: string;
  entries: Entry[];
  sharedTimeIn: string;
}
export const DEFAULT_BODY =
  "**Login:** {{login}}\n**Name:** {{name}}\n**Time in:** {{time_in}}\n**Time out:** {{time_out}}";
export function initialStore(): Store {
  return {
    version: 1,
    templates: [{ id: "default", label: "Default", body: DEFAULT_BODY }],
    selectedTemplateId: "default",
    entries: [],
    sharedTimeIn: "",
  };
}
