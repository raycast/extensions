import { ComponentItem } from "./component";
import { components, proComponents, proseComponents } from "./components-list";
import { camelCase, kebabCase } from "scule";

/**
 * Get all components from all categories
 */
export function getAllComponents(): ComponentItem[] {
  const allComponents: ComponentItem[] = [];

  // Add base components
  components.forEach((name: string) => {
    allComponents.push({
      name: kebabCase(name),
      type: "base",
      camelCaseName: camelCase(name),
    });
  });

  // Add pro components
  proComponents.forEach((name: string) => {
    allComponents.push({
      name: kebabCase(name),
      type: "pro",
      camelCaseName: camelCase(name),
    });
  });

  // Add prose components
  proseComponents.forEach((name: string) => {
    allComponents.push({
      name: kebabCase(name),
      type: "prose",
      camelCaseName: camelCase(name),
    });
  });

  return allComponents;
}

/**
 * Filter components based on search text and type
 */
export function filterComponents(
  components: ComponentItem[],
  searchText: string,
  selectedType: string | null,
): ComponentItem[] {
  return components.filter((component) => {
    // Filter by type if selected
    if (selectedType && component.type !== selectedType) {
      return false;
    }

    // Filter by search text
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

/**
 * Sort components alphabetically by name
 */
export function sortComponentsByName(components: ComponentItem[]): ComponentItem[] {
  return [...components].sort((a, b) => a.name.localeCompare(b.name));
}

export const V3_URL = "https://ui.nuxt.com";
export const V2_URL = "https://ui2.nuxt.com";
