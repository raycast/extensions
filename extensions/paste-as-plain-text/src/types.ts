export type TrimOption = "none" | "leading" | "trailing" | "both";

export interface Preferences {
  cleanLineBreaks: boolean;
  trim: TrimOption;
}
