import { RawTemplate, Template } from "../models";
import { getIconWithFallback } from "../utils";

/**
 * Map raw `Template` objects from the API into display-ready data (e.g., icon).
 */
export async function mapTemplates(templates: RawTemplate[]): Promise<Template[]> {
  return Promise.all(
    templates.map(async (template) => {
      return mapTemplate(template);
    }),
  );
}

/**
 * Map raw `Template` object from the API into display-ready data (e.g., icon).
 */
export async function mapTemplate(template: RawTemplate): Promise<Template> {
  const icon = await getIconWithFallback(template.icon, "template");

  return {
    ...template,
    name: template.name || "Untitled",
    icon: icon,
  };
}
