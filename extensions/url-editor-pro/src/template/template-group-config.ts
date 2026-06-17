import { TemplateGroup } from "../types";

export const DEFAULT_TEMPLATE_GROUPS: TemplateGroup[] = [
  {
    id: "shorten-url",
    name: "Shorten URL",
    description: "Generate shortened URL variants",
    templates: ["{{protocol}}://{{host}}", "{{protocol}}://{{host}}{{path:*}}"],
    enabled: true,
  },
  {
    id: "remove-query",
    name: "Remove Query Parameters",
    description: "Generate URLs without query parameters",
    templates: ["{{protocol}}://{{host}}{{path}}", "{{protocol}}://{{host}}{{path:*}}"],
    enabled: true,
  },
  {
    id: "path-only",
    name: "Path Hierarchy",
    description: "Show all path levels",
    templates: ["{{protocol}}://{{host}}{{path:*}}"],
    enabled: true,
  },
];
