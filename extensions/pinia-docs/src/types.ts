export interface Section {
  title: SectionTitle;
  items: SectionItem[];
}

interface SectionItem {
  title: SectionItemTitle;
  url: string;
}

export type SectionTitle = "Introduction" | "Core Concepts" | "Server-Side Rendering (SSR)" | "Cookbook";

export type SectionItemTitle =
  // Introduction items
  | "What is Pinia?"
  | "Getting Started"

  // Core Concepts items
  | "Defining a Store"
  | "State"
  | "Getters"
  | "Actions"
  | "Plugins"
  | "Stores outside of components"

  // Server-Side Rendering (SSR) items
  | "Vue and Vite"
  | "Nuxt"

  // Cookbook items
  | "Index"
  | "Migration from Vuex ≤4"
  | "Hot Module Replacement"
  | "Testing"
  | "Usage without setup()"
  | "Composing Stores"
  | "VSCode Snippets"
  | "Migration from v2 to v3"
  | "Migration from v0/v1 to v2"
  | "Dealing with composables";

export enum SectionFilter {
  ALL = "All",
  INTRODUCTION = "Introduction",
  CORE_CONCEPTS = "Core Concepts",
  SSR = "Server-Side Rendering (SSR)",
  COOKBOOK = "Cookbook",
}

export type SectionFilterString = keyof typeof SectionFilter;
