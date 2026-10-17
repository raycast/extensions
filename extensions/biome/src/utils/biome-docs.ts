import documentationPagesData from "../data/documentation-pages.json";

export type DocPage = {
  id: string;
  title: string;
  description: string;
  url: string;
  category: string;
  tags: string[];
};

export const documentationPages: DocPage[] = documentationPagesData;

export function searchDocs(query: string): DocPage[] {
  const lowerQuery = query.toLowerCase();
  return documentationPages.filter((page) => {
    return (
      page.title.toLowerCase().includes(lowerQuery) ||
      page.description.toLowerCase().includes(lowerQuery) ||
      page.tags.some((tag) => tag.toLowerCase().includes(lowerQuery)) ||
      page.category.toLowerCase().includes(lowerQuery)
    );
  });
}

export function getCategories(): string[] {
  const categories = new Set(documentationPages.map((page) => page.category));
  return Array.from(categories).sort();
}

export function getPagesByCategory(category: string): DocPage[] {
  return documentationPages
    .filter((page) => page.category === category)
    .sort((a, b) => a.title.localeCompare(b.title));
}
