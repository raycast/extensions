import { CategoryType, CheatsheetData, Section } from "../types";
import { SECTION_ORDER } from "../utils/constants";
import basicCommands from "./basic-commands.json";
import cliFlags from "./cli-flags.json";
import environment from "./environment.json";
import settings from "./settings.json";
import slashCommands from "./slash-commands.json";
import thinkingKeywordsData from "./thinking-keywords.json";

// Cast thinking-keywords.json to the Section type
const thinkingSection = thinkingKeywordsData as Section;

const sectionMap: Record<CategoryType, Section> = {
  basic: basicCommands as Section,
  slash: slashCommands as Section,
  flag: cliFlags as Section,
  thinking: thinkingSection,
  settings: settings as Section,
  environment: environment as Section,
  all: {
    id: "all",
    title: "All Categories",
    description: "All commands and keywords",
    commands: [],
  } as Section, // 'all' is a placeholder section with safe default values
};

const orderedSections = SECTION_ORDER.map(id => sectionMap[id]);

export const cheatsheetData: CheatsheetData = {
  sections: orderedSections,
};
