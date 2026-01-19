import { Root, Templateable, DisplayUrl } from "./types";
import {
  applyTemplate,
  getDomainKeywords,
  getSafeTitle,
  getEnhancedKeywords,
  combineKeywords,
  getFallbackIcon,
  mergePlaceholders,
} from "./utils";

export function getAllAppliedTemplates(entity: Templateable, rootData: Root): string[] {
  const allAppliedTemplates: string[] = [];

  if (entity.appliedTemplates && entity.appliedTemplates.length > 0) {
    allAppliedTemplates.push(...entity.appliedTemplates);
  }

  if (entity.appliedTemplateGroups && rootData.templateGroups) {
    for (const templateGroupName of entity.appliedTemplateGroups) {
      const templateGroup = rootData.templateGroups[templateGroupName];
      if (templateGroup && templateGroup.appliedTemplates) {
        allAppliedTemplates.push(...templateGroup.appliedTemplates);
      }
    }
  }

  return allAppliedTemplates;
}

export function createTemplateDisplayUrls(
  entity: Templateable,
  rootData: Root,
  keyPrefix: string,
  fallbackIcon?: string,
): DisplayUrl[] {
  const templateUrls: DisplayUrl[] = [];
  const allAppliedTemplates = getAllAppliedTemplates(entity, rootData);

  for (const templateKey of allAppliedTemplates) {
    const template = rootData.templates?.[templateKey];
    if (!template || !template.templateUrl) continue;

    const placeholders = mergePlaceholders(rootData.globalPlaceholders, entity.templatePlaceholders);

    if (!placeholders) continue;

    const finalUrl = applyTemplate(template.templateUrl, placeholders);
    const tags = template.tags || [];

    templateUrls.push({
      key: `${keyPrefix}-template-${templateKey}`,
      title: getSafeTitle(template.title),
      url: finalUrl,
      keywords: combineKeywords(getEnhancedKeywords(getSafeTitle(template.title)), tags, getDomainKeywords(finalUrl)),
      icon: getFallbackIcon(template.icon || fallbackIcon, !!template.openIn),
      tags: tags,
      openIn: template.openIn,
    });
  }

  return templateUrls;
}
