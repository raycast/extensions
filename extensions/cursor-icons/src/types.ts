export type IconStyle = "outline" | "filled";

export type ViewFilter = "all" | "concepts" | "outline" | "filled";

export type PrimaryAction = "copyIcon" | "pasteIcon" | "copyName" | "pasteName";

export type PreferencesValues = {
  primaryAction: PrimaryAction;
  gridColumns: string;
  showName: boolean;
  showRecent: boolean;
};

export type CursorIcon = {
  name: string;
  displayName: string;
  tags: string[];
  unicode: string;
  codepoint: number;
  style: IconStyle;
  asset: string;
  source: string;
};

export type CursorConcept = {
  concept: string;
  iconName: string;
  unicode: string;
  asset: string;
  tags: string[];
};

export type CursorIconData = {
  icons: CursorIcon[];
  concepts: CursorConcept[];
  meta: {
    sourceRoot: string;
    size: string;
    iconCount: number;
    conceptCount: number;
    skippedCount: number;
    skippedConceptCount: number;
  };
};
