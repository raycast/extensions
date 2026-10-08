export interface Section {
  title: SectionTitle;
  items: SectionItem[];
}

interface SectionItem {
  title: SectionItemTitle;
  url: string;
}

export type SectionTitle = "Setup" | "Essentials" | "Advanced" | "Miscellaneous";

export type SectionItemTitle =
  // Setup
  | "Introduction"
  | "Installation"

  // Essentials
  | "Getting Started"
  | "Dynamic Route Matching"
  | "Routes' Matching Syntax"
  | "Named Routes"
  | "Nested Routes"
  | "Programmatic Navigation"
  | "Named Views"
  | "Redirect and Alias"
  | "Passing Props to Route Components"
  | "Active links"
  | "Different History modes"

  // Advanced
  | "Navigation guards"
  | "Route Meta Fields"
  | "Data Fetching"
  | "Composition API"
  | "RouterView slot"
  | "Transitions"
  | "Scroll Behavior"
  | "Lazy Loading Routes"
  | "Typed Routes"
  | "Extending RouterLink"
  | "Navigation Failures"
  | "Dynamic Routing"

  // Miscellaneous
  | "Migrating from Vue 2";

export enum SectionFilter {
  ALL = "All",
  SETUP = "Setup",
  ESSENTIALS = "Essentials",
  ADVANCED = "Advanced",
  MISCELLANEOUS = "Miscellaneous",
}

export type SectionFilterString = keyof typeof SectionFilter;
