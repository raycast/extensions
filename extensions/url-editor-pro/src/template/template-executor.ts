import { TemplateGroup } from "../types";
import { buildTemplateContext } from "./template-context";
import { renderTemplate } from "./template-renderer";
import { parseUrl } from "../utils";

export interface TemplateResult {
  urls: string[];
  sourceTemplate: string;
  groupName: string;
  expansionInfo?: {
    type: "path-hierarchy";
    levels: number;
  };
}

export function executeTemplateGroup(group: TemplateGroup, url: string): TemplateResult[] {
  const parsed = parseUrl(url);
  if (!parsed) {
    throw new Error("Invalid URL");
  }

  const context = buildTemplateContext(parsed);
  const results: TemplateResult[] = [];

  for (const template of group.templates) {
    const rendered = renderTemplate(template, context);
    const urls = Array.isArray(rendered) ? rendered : [rendered];

    results.push({
      urls,
      sourceTemplate: template,
      groupName: group.name,
      expansionInfo: Array.isArray(rendered)
        ? {
            type: "path-hierarchy",
            levels: urls.length,
          }
        : undefined,
    });
  }

  return results;
}

export function executeAllTemplateGroups(groups: TemplateGroup[], url: string): TemplateResult[] {
  const enabledGroups = groups.filter((g) => g.enabled !== false);
  const allResults: TemplateResult[] = [];

  for (const group of enabledGroups) {
    try {
      const results = executeTemplateGroup(group, url);
      allResults.push(...results);
    } catch (error) {
      console.error(`Failed to execute template group "${group.name}":`, error);
    }
  }

  return allResults;
}
