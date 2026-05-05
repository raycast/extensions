import { Section, Command, ThinkingKeyword, CategoryType } from "../types";

export function filterSectionsByCategory(sections: Section[], category: CategoryType): Section[] {
  if (category === "all") return sections;
  return sections.filter(s => s.id === category);
}

export function filterSectionsBySearch(sections: Section[], searchText: string): Section[] {
  if (!searchText) return sections;

  const searchLower = searchText.toLowerCase();

  return sections
    .map(section => ({
      ...section,
      commands: filterCommands(section.commands || [], searchLower),
      thinkingKeywords: filterThinkingKeywords(section.thinkingKeywords || [], searchLower),
    }))
    .filter(
      section =>
        (section.commands && section.commands.length > 0) ||
        (section.thinkingKeywords && section.thinkingKeywords.length > 0)
    );
}

export function filterCommands(commands: Command[], searchTerm: string): Command[] {
  return commands.filter(
    command =>
      command.name.toLowerCase().includes(searchTerm) ||
      command.description.toLowerCase().includes(searchTerm) ||
      (command.tags && command.tags.some(tag => tag.toLowerCase().includes(searchTerm)))
  );
}

export function filterThinkingKeywords(keywords: ThinkingKeyword[], searchTerm: string): ThinkingKeyword[] {
  return keywords.filter(
    keyword =>
      keyword.keyword.toLowerCase().includes(searchTerm) ||
      keyword.description.toLowerCase().includes(searchTerm) ||
      keyword.budget.toLowerCase().includes(searchTerm)
  );
}

export function applyFilters(sections: Section[], selectedCategory: CategoryType, searchText: string): Section[] {
  // 1. Filter by category first
  let filteredSections = filterSectionsByCategory(sections, selectedCategory);

  // 2. Then filter by search text
  filteredSections = filterSectionsBySearch(filteredSections, searchText);

  return filteredSections;
}
