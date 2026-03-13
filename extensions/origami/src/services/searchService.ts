import { Field, Instance } from "../types";

/**
 * Checks if a string matches the search expression.
 *
 * @param searchText The search expression.
 * @param text The content to search within (field value, instance ID, etc.).
 * @returns True if the text matches the search expression, false otherwise.
 */
export function matchesSearchExpression(searchText: string, text: string): boolean {
  if (!text || !searchText) return false;

  const normalizedSearchText = searchText.toLowerCase().trim();
  if (!normalizedSearchText) return true;

  const lowercaseText = text.toLowerCase();

  if (normalizedSearchText.includes(" ")) {
    const searchTerms = normalizedSearchText.split(/\s+/).filter(Boolean);
    const textWords = lowercaseText.split(/\s+/);

    let currentWordIndex = 0;

    for (const term of searchTerms) {
      let found = false;

      for (let i = currentWordIndex; i < textWords.length; i++) {
        if (textWords[i].startsWith(term)) {
          currentWordIndex = i + 1;
          found = true;
          break;
        }
      }

      if (!found) return false;
    }

    return true;
  } else {
    // For single-term searches, avoid splitting if possible
    if (lowercaseText.startsWith(normalizedSearchText)) return true;

    const words = lowercaseText.split(/\s+/);
    return words.some((word) => word.startsWith(normalizedSearchText));
  }
}

/**
 * Filters instances based on search text.
 *
 * @param instances The instances to filter.
 * @param searchText The search text.
 * @returns The filtered instances.
 */
export function filterInstances(instances: Instance[], searchText: string): Instance[] {
  // Ensure instances is an array
  if (!Array.isArray(instances)) return [];

  if (!searchText) return instances;

  const normalizedSearchText = searchText.toLowerCase().trim();
  if (!normalizedSearchText) return instances;

  const fieldMatchesSearch = (field: Field, normalizedSearchText: string): boolean => {
    if (!field.value) return false;

    if (typeof field.value === "string" || typeof field.value === "number") {
      return matchesSearchExpression(normalizedSearchText, String(field.value));
    }

    if (field.value && typeof field.value === "object" && "formatted_address" in field.value) {
      return matchesSearchExpression(normalizedSearchText, field.value.formatted_address);
    }

    return (
      Array.isArray(field.value) &&
      field.value.some((val) => {
        if (typeof val === "string" || typeof val === "number") {
          return matchesSearchExpression(normalizedSearchText, String(val));
        }
        return typeof val === "object" && matchesSearchExpression(normalizedSearchText, val.text);
      })
    );
  };

  return instances.filter((instance) => {
    // Check instance ID
    if (matchesSearchExpression(normalizedSearchText, instance.instance_data._id)) {
      return true;
    }

    // Check fields
    for (const fieldGroup of instance.instance_data.field_groups) {
      for (const fieldsArray of fieldGroup.fields_data) {
        for (const field of fieldsArray) {
          if (fieldMatchesSearch(field, normalizedSearchText)) {
            return true;
          }
        }
      }
    }

    return false;
  });
}
