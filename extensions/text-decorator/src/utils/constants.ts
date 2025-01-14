import { DecorationFont } from "../types/types";

export enum LocalStorageKey {
  DETAIL_KEY = "Show Detail",
}
export const fontFamily: DecorationFont[] = [
  { title: "Bold serif", value: "bold_serif", icon: "bold_serif.svg" },
  { title: "Italic serif", value: "italic_serif", icon: "italic_serif.svg" },
  { title: "Bold italic serif", value: "bold_italic_serif", icon: "bold_italic_serif.svg" },
  { title: "Script", value: "script", icon: "script.svg" },
  { title: "Bold script", value: "bold_script", icon: "bold_script.svg" },
  { title: "Fraktur", value: "fraktur", icon: "fraktur.svg" },
  { title: "Bold fraktur", value: "bold_fraktur", icon: "bold_fraktur.svg" },
  { title: "Double struck", value: "double_struck", icon: "double_struck.svg" },
  { title: "Sans serif", value: "sans_serif", icon: "sans_serif.svg" },
  { title: "Bold sans serif", value: "bold_sans_serif", icon: "bold_sans_serif.svg" },
  { title: "Italic sans serif", value: "italic_sans_serif", icon: "italic_sans_serif.svg" },
  { title: "Bold italic sans serif", value: "bold_italic_sans_serif", icon: "bold_italic_sans_serif.svg" },
  { title: "Monospace", value: "monospace", icon: "monospace.svg" },
  { title: "Regional indicator", value: "regional_indicator", icon: "regional_indicator.png" },
  { title: "Circle", value: "circle", icon: "circle.svg" },
  { title: "Black circle", value: "black_circle", icon: "black_circle.svg" },
  { title: "Square", value: "square", icon: "square.svg" },
  { title: "Parenthesized", value: "parenthesized", icon: "parenthesized.svg" },
  { title: "Fullwidth", value: "fullwidth", icon: "fullwidth.svg" },
];

export const SEARCH_PLACEHOLDER = "Search fonts";
