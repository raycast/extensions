import { Me, Template, Usage } from "../types";
import { request } from "./instabox";

/** The account behind the API key, including how its machines' idle pause may be set. */
export function getMe() {
  return request<Me>("GET", "/v1/me");
}

export function getUsage() {
  return request<Usage>("GET", "/v1/usage");
}

/** Templates offered for new machines, one entry per template ID. */
export async function listTemplates() {
  const { templates } = await request<{ templates: Template[] }>("GET", "/v1/templates");
  const byId = new Map<string, Template>();
  for (const template of templates) {
    if (!template.hidden && !byId.has(template.id)) byId.set(template.id, template);
  }
  return [...byId.values()];
}
