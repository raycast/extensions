import { ComponentItem, components, proseComponents } from "./components";
import { camelCase, kebabCase } from "scule";

export function getAllComponents(): ComponentItem[] {
  const allComponents: ComponentItem[] = [];

  components.forEach((name: string) => {
    allComponents.push({
      name: kebabCase(name),
      type: "base",
      camelCaseName: camelCase(name),
    });
  });

  proseComponents.forEach((name: string) => {
    allComponents.push({
      name: kebabCase(name),
      type: "prose",
      camelCaseName: camelCase(name),
    });
  });

  return allComponents;
}

export function filterComponents(
  components: ComponentItem[],
  searchText: string,
  selectedType: string | null,
): ComponentItem[] {
  return components.filter((component) => {
    if (selectedType && component.type !== selectedType) {
      return false;
    }

    if (searchText) {
      const normalizedSearchText = searchText.toLowerCase();
      return (
        component.name.toLowerCase().includes(normalizedSearchText) ||
        component.camelCaseName.toLowerCase().includes(normalizedSearchText)
      );
    }

    return true;
  });
}

export function sortComponentsByName(components: ComponentItem[]): ComponentItem[] {
  return [...components].sort((a, b) => a.name.localeCompare(b.name));
}

export function getDocsUrl(): string {
  return "https://ui.nuxt.com/docs";
}

export function getBranch(): string {
  return "main";
}

export function getNuxtDocsUrl(): string {
  return "https://nuxt.com/docs/4.x";
}
