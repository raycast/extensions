import { templateMap } from "./templates";

export type Template = {
  placeholder: string;
  replacement: () => string | Promise<string>;
};

/** both content and template might have templates to apply */
export async function applyTemplates(content: string, template = "") {
  const preprocessed = template.includes("{content}")
    ? template // Has {content} e.g. | {hour}:{minute} | {content} |
    : template + content; // Does not have {content}, then add it to the end

  let result = preprocessed.replaceAll("{content}", content);

  // Find all placeholders in the content
  const placeholderRegex = /{.*?}/g;
  const placeholders = result.match(placeholderRegex) || [];

  for (const placeholder of placeholders) {
    const replacement = templateMap.get(placeholder);

    if (replacement) {
      try {
        const value = await replacement();
        result = result.replaceAll(placeholder, value);
      } catch (error) {
        console.error(`Error replacing ${placeholder}:`, error);
      }
    }
  }
  return result;
}
