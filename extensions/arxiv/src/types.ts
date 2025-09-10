import { Color } from "@raycast/api";

export interface SearchResult {
  id: string;
  published: string;
  updated?: string;
  title: string;
  summary?: string;
  authors: string[];
  category: string;
  link: string;
  abstractUrl?: string;
  pdfUrl?: string;
  texUrl?: string;
  htmlUrl?: string;
  doi?: string;
  comment?: string;
  journalRef?: string;
}

export interface SearchListItemProps {
  id: string;
  published: string;
  updated?: string;
  title: string;
  summary?: string;
  authors: string[];
  category: string;
  first_category: string;
  pdf_link: string;
  abstract_url?: string;
  tex_url?: string;
  html_url?: string;
  doi?: string;
  comment?: string;
  journal_ref?: string;
}

export enum ArxivCategory {
  All = "",
  Physics = "phys",
  // Physics is split into multiple subcategories
  Mathematics = "math",
  ComputerScience = "cs",
  QuantitativeBiology = "q-bio",
  QuantitativeFinance = "q-fin",
  Statistics = "stat",
  ElectricalEngineeringAndSystemsScience = "eess",
  Economics = "econ",
}

export enum ArxivCategoryColour {
  "physics" = Color.Blue,
  "math" = Color.Green,
  "cs" = Color.Red,
  "q-bio" = Color.Yellow,
  "q-fin" = Color.Purple,
  "stat" = Color.Orange,
  "eess" = Color.Purple,
  "econ" = Color.Magenta,
}
