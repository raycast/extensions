export interface Section {
  title: string;
  items: SectionItem[];
}

interface SectionItem {
  title: string;
  url: string;
}

export enum ComponentFilter {
  ALL = "All",
  CONTAINMENT = "Containment",
  NAVIGATION = "Navigation",
  FORM_INPUTS_CONTROLS = "Form inputs and controls",
  LAYOUTS = "Layouts",
  SELECTION = "Selection",
  DATA_DISPLAY = "Data and display",
  FEEDBACK = "Feedback",
  IMAGES_ICONS = "Images and icons",
  PICKERS = "Pickers",
  PROVIDERS = "Providers",
  MISCELLANEOUS = "Miscellaneous",
  LABS = "Labs",
}

export type ComponentFilterString = keyof typeof ComponentFilter;

export enum SectionFilter {
  ALL = "All",
  INTRODUCTION = "Introduction",
  GETTING_STARTED = "Getting started",
  FEATURES = "Features",
  STYLES_AND_ANIMATIONS = "Styles and animations",
  COMMON_CONCEPTS = "Common concepts",
  COMPONENTS = "Components",
  API = "API",
  DIRECTIVES = "Directives",
  LABS = "Labs",
  RESOURCES = "Resources",
  ABOUT = "About",
}

export type SectionFilterString = keyof typeof SectionFilter;
