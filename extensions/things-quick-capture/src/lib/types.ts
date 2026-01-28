export interface CapturedContext {
  appName: string;
  title: string;
  url: string | null;
  type: "browser" | "email" | "file" | "note" | "message" | "generic";
}

export interface ThingsTaskParams {
  title: string;
  notes?: string;
  when?: "today" | "evening" | "tomorrow" | "someday";
  tags?: string[];
  list?: string;
  showQuickEntry?: boolean;
}

export interface Preferences {
  defaultList: "inbox" | "today" | "evening" | "someday";
  urlInNotes: "notes" | "title";
}
