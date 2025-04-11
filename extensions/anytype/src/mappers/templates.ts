import { Icon } from "@raycast/api";
import { Template } from "../helpers/schemas";

/**
 * Map raw `Template` objects from the API into display-ready data (e.g., icon).
 */
export async function mapTemplates(templates: Template[]): Promise<Template[]> {
  return Promise.all(
    templates.map(async (template) => {
      return {
        ...template,
        name: template.name || "Untitled",
        icon: template.icon || Icon.BulletPoints,
      };
    }),
  );
}
