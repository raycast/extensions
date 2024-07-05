export interface ToggleItem {
  /** When was created/last modified */
  at: string;
  id: number;
}

export interface Preferences {
  MenuBar: {
    showTitleInMenuBar: boolean;
    showTimeInMenuBar: boolean;
    showProjectInMenuBar: boolean;
    showClientInMenuBar: boolean;
  };
}
