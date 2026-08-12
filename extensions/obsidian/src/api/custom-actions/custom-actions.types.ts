export interface CustomAction {
  id: string;
  title: string;
  description?: string;
  vaultName: string;
  path: string; // Creates the note if it doesn't exist, appends if it does. Supports variables like {date}, {year} etc.
  template: string; // The content to append. Supports {clipboard}
  type?: "capture" | "template"; // "capture": inputs gets wrapped in template. "template": template fills input, user edits.
  mode: "append" | "prepend" | "overwrite";
  heading?: string; // Optional heading to append under
  silent: boolean; // Open obsidian in background?
}
