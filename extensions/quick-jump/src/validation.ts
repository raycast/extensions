import { Root, Templateable } from "./types";
import { detectCircularPlaceholderDependencies, extractPlaceholders } from "./utils";

export interface ValidationError {
  type: "missing_placeholder" | "invalid_template" | "invalid_url" | "missing_template" | "circular_dependency";
  message: string;
  location: string;
  severity: "error" | "warning";
  suggestion?: string;
}

export interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
  warnings: ValidationError[];
}

export function validateConfiguration(data: Root): ValidationResult {
  const errors: ValidationError[] = [];
  const warnings: ValidationError[] = [];

  if (!data) {
    errors.push({
      type: "invalid_template",
      message: "Configuration data is null or undefined",
      location: "root",
      severity: "error",
      suggestion: "Check your configuration file format",
    });
    return { isValid: false, errors, warnings };
  }

  validatePlaceholderCircularDependencies(data.globalPlaceholders, errors, "globalPlaceholders");

  if (data.templates) {
    validateTemplates(data, errors, warnings);
  }
  if (data.groups) {
    validateGroups(data, errors, warnings);
  }
  if (data.urls) {
    validateUrls(data, errors, warnings);
  }
  if (data.templateGroups) {
    validateTemplateGroups(data, errors);
  }

  validateUnusedGlobalPlaceholders(data, warnings);

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  };
}

function validateTemplates(data: Root, errors: ValidationError[], warnings: ValidationError[]) {
  for (const [templateKey, template] of Object.entries(data.templates || {})) {
    if (!template) continue;

    if (!template.templateUrl) {
      errors.push({
        type: "invalid_template",
        message: `Template "${templateKey}" is missing templateUrl`,
        location: `templates.${templateKey}`,
        severity: "error",
        suggestion: "Add a templateUrl property to the template",
      });
      continue;
    }

    if (!template.title) {
      warnings.push({
        type: "invalid_template",
        message: `Template "${templateKey}" has no title or name`,
        location: `templates.${templateKey}`,
        severity: "warning",
        suggestion: "Add a title or name property for better display",
      });
    }

    const placeholders = extractPlaceholders(template.templateUrl);
    if (placeholders.length === 0) {
      warnings.push({
        type: "invalid_template",
        message: `Template "${templateKey}" has no placeholders`,
        location: `templates.${templateKey}`,
        severity: "warning",
        suggestion: "Consider adding placeholders like ${key} to make the template dynamic",
      });
    }
  }
}

function validateGroups(data: Root, errors: ValidationError[], warnings: ValidationError[]) {
  for (const [groupKey, group] of Object.entries(data.groups || {})) {
    if (!group) continue;

    validateTemplateable(group, data, errors, warnings, `groups.${groupKey}`);

    if (group.linkedUrls) {
      for (const linkedUrlKey of group.linkedUrls) {
        if (!data.urls || !data.urls[linkedUrlKey]) {
          errors.push({
            type: "missing_template",
            message: `Group "${groupKey}" references non-existent URL "${linkedUrlKey}"`,
            location: `groups.${groupKey}.linkedUrls`,
            severity: "error",
            suggestion: `Add the URL "${linkedUrlKey}" to the urls section or remove it from linkedUrls`,
          });
        }
      }
    }

    if (group.otherUrls) {
      for (const [otherUrlKey, otherUrl] of Object.entries(group.otherUrls)) {
        if (!otherUrl) continue;
        if (!otherUrl.url) {
          errors.push({
            type: "invalid_url",
            message: `Other URL "${otherUrlKey}" in group "${groupKey}" has no URL`,
            location: `groups.${groupKey}.otherUrls.${otherUrlKey}`,
            severity: "error",
            suggestion: "Add a url property to the otherUrl",
          });
        }
      }
    }

    validateAppliedTemplates(group, data, errors, warnings, `groups.${groupKey}`);
  }
}

function validateUrls(data: Root, errors: ValidationError[], warnings: ValidationError[]) {
  for (const [urlKey, url] of Object.entries(data.urls || {})) {
    if (!url) continue;

    if (!url.url) {
      errors.push({
        type: "invalid_url",
        message: `URL "${urlKey}" has no URL property`,
        location: `urls.${urlKey}`,
        severity: "error",
        suggestion: "Add a url property to the URL",
      });
    }

    validateTemplateable(url, data, errors, warnings, `urls.${urlKey}`);
    validateAppliedTemplates(url, data, errors, warnings, `urls.${urlKey}`);
  }
}

function validateTemplateGroups(data: Root, errors: ValidationError[]) {
  if (!data.templateGroups) return;

  for (const [groupKey, templateGroup] of Object.entries(data.templateGroups)) {
    if (!templateGroup) continue;

    if (templateGroup.appliedTemplates) {
      for (const templateKey of templateGroup.appliedTemplates) {
        if (!data.templates || !data.templates[templateKey]) {
          errors.push({
            type: "missing_template",
            message: `Template group "${groupKey}" references non-existent template "${templateKey}"`,
            location: `templateGroups.${groupKey}.appliedTemplates`,
            severity: "error",
            suggestion: `Add the template "${templateKey}" to the templates section or remove it from appliedTemplates`,
          });
        }
      }
    }
  }
}

function validateTemplateable(
  entity: Templateable,
  data: Root,
  errors: ValidationError[],
  warnings: ValidationError[],
  location: string,
) {
  if (!entity.templatePlaceholders) return;

  const allAppliedTemplates: string[] = [];

  if (entity.appliedTemplates) {
    allAppliedTemplates.push(...entity.appliedTemplates);
  }

  if (entity.appliedTemplateGroups && data.templateGroups) {
    for (const templateGroupName of entity.appliedTemplateGroups) {
      const templateGroup = data.templateGroups[templateGroupName];
      if (templateGroup && templateGroup.appliedTemplates) {
        allAppliedTemplates.push(...templateGroup.appliedTemplates);
      }
    }
  }

  const allRequiredPlaceholders = new Set<string>();
  const localProvidedPlaceholders = Object.keys(entity.templatePlaceholders || {});
  const globalProvidedPlaceholders = Object.keys(data.globalPlaceholders || {});
  const allProvidedPlaceholders = [...localProvidedPlaceholders, ...globalProvidedPlaceholders];

  for (const templateKey of allAppliedTemplates) {
    const template = data.templates?.[templateKey];
    if (!template || !template.templateUrl) continue;

    const requiredPlaceholders = extractPlaceholders(template.templateUrl);
    requiredPlaceholders.forEach((placeholder) => allRequiredPlaceholders.add(placeholder));
  }

  // Also check placeholders used within other placeholder values (nested placeholders)
  // e.g., projectDirectory: "${teamProjectDirectory}/api/${foo}" uses both teamProjectDirectory and foo
  const allPlaceholderValues = {
    ...data.globalPlaceholders,
    ...entity.templatePlaceholders,
  };
  for (const value of Object.values(allPlaceholderValues)) {
    const referencedPlaceholders = extractPlaceholders(value);
    referencedPlaceholders.forEach((placeholder) => allRequiredPlaceholders.add(placeholder));
  }

  // Check placeholders used in otherUrls (for groups)
  if ("otherUrls" in entity && entity.otherUrls) {
    for (const url of Object.values(entity.otherUrls)) {
      if (url?.url) {
        const referencedPlaceholders = extractPlaceholders(url.url);
        referencedPlaceholders.forEach((placeholder) => allRequiredPlaceholders.add(placeholder));
      }
    }
  }

  for (const placeholder of allRequiredPlaceholders) {
    if (!allProvidedPlaceholders.includes(placeholder)) {
      errors.push({
        type: "missing_placeholder",
        message: `Template requires placeholder "${placeholder}" but it's not defined`,
        location: `${location}.templatePlaceholders`,
        severity: "error",
        suggestion: `Add "${placeholder}": "your-value" to templatePlaceholders or globalPlaceholders`,
      });
    }
  }

  const unusedPlaceholders = localProvidedPlaceholders.filter((p) => !allRequiredPlaceholders.has(p));
  if (unusedPlaceholders.length > 0) {
    warnings.push({
      type: "missing_placeholder",
      message: `Unused placeholders: ${unusedPlaceholders.join(", ")}`,
      location: `${location}.templatePlaceholders`,
      severity: "warning",
      suggestion: "Consider removing unused placeholders to keep configuration clean",
    });
  }
}

function validateAppliedTemplates(
  entity: Templateable,
  data: Root,
  errors: ValidationError[],
  warnings: ValidationError[],
  location: string,
) {
  if (entity.appliedTemplates) {
    for (const templateKey of entity.appliedTemplates) {
      if (!data.templates || !data.templates[templateKey]) {
        errors.push({
          type: "missing_template",
          message: `References non-existent template "${templateKey}"`,
          location: `${location}.appliedTemplates`,
          severity: "error",
          suggestion: `Add the template "${templateKey}" to the templates section or remove it from appliedTemplates`,
        });
      }
    }
  }

  if (entity.appliedTemplateGroups && data.templateGroups) {
    for (const templateGroupKey of entity.appliedTemplateGroups) {
      if (!data.templateGroups[templateGroupKey]) {
        errors.push({
          type: "missing_template",
          message: `References non-existent template group "${templateGroupKey}"`,
          location: `${location}.appliedTemplateGroups`,
          severity: "error",
          suggestion: `Add the template group "${templateGroupKey}" to the templateGroups section or remove it from appliedTemplateGroups`,
        });
      }
    }
  }
}

function validatePlaceholderCircularDependencies(
  placeholders: Record<string, string> | undefined,
  errors: ValidationError[],
  location: string,
) {
  if (!placeholders) return;

  const circularError = detectCircularPlaceholderDependencies(placeholders);
  if (circularError) {
    errors.push({
      type: "circular_dependency",
      message: circularError,
      location,
      severity: "error",
      suggestion: "Remove the circular reference by ensuring placeholders don't reference each other in a cycle",
    });
  }
}

function validateUnusedGlobalPlaceholders(data: Root, warnings: ValidationError[]) {
  if (!data.globalPlaceholders) return;

  const globalPlaceholderKeys = Object.keys(data.globalPlaceholders);
  if (globalPlaceholderKeys.length === 0) return;

  const usedPlaceholders = new Set<string>();

  // Collect all placeholders used in templates
  if (data.templates) {
    for (const template of Object.values(data.templates)) {
      if (!template?.templateUrl) continue;
      const placeholders = extractPlaceholders(template.templateUrl);
      placeholders.forEach((p) => usedPlaceholders.add(p));
    }
  }

  // Collect all placeholders used in groups
  if (data.groups) {
    for (const group of Object.values(data.groups)) {
      if (!group) continue;

      // Check applied templates
      const allAppliedTemplates = [
        ...(group.appliedTemplates || []),
        ...(group.appliedTemplateGroups?.flatMap((tgKey) => data.templateGroups?.[tgKey]?.appliedTemplates || []) ||
          []),
      ];

      for (const templateKey of allAppliedTemplates) {
        const template = data.templates?.[templateKey];
        if (!template?.templateUrl) continue;
        const placeholders = extractPlaceholders(template.templateUrl);
        placeholders.forEach((p) => usedPlaceholders.add(p));
      }

      // Check local placeholder values (they might reference global placeholders)
      if (group.templatePlaceholders) {
        for (const value of Object.values(group.templatePlaceholders)) {
          const placeholders = extractPlaceholders(value);
          placeholders.forEach((p) => usedPlaceholders.add(p));
        }
      }

      // Check other URLs
      if (group.otherUrls) {
        for (const url of Object.values(group.otherUrls)) {
          if (url.url) {
            const placeholders = extractPlaceholders(url.url);
            placeholders.forEach((p) => usedPlaceholders.add(p));
          }
        }
      }
    }
  }

  // Collect all placeholders used in standalone URLs
  if (data.urls) {
    for (const url of Object.values(data.urls)) {
      if (!url) continue;

      // Check applied templates
      const allAppliedTemplates = [
        ...(url.appliedTemplates || []),
        ...(url.appliedTemplateGroups?.flatMap((tgKey) => data.templateGroups?.[tgKey]?.appliedTemplates || []) || []),
      ];

      for (const templateKey of allAppliedTemplates) {
        const template = data.templates?.[templateKey];
        if (!template?.templateUrl) continue;
        const placeholders = extractPlaceholders(template.templateUrl);
        placeholders.forEach((p) => usedPlaceholders.add(p));
      }

      // Check local placeholder values
      if (url.templatePlaceholders) {
        for (const value of Object.values(url.templatePlaceholders)) {
          const placeholders = extractPlaceholders(value);
          placeholders.forEach((p) => usedPlaceholders.add(p));
        }
      }
    }
  }

  // Check if global placeholders reference each other
  for (const value of Object.values(data.globalPlaceholders)) {
    const placeholders = extractPlaceholders(value);
    placeholders.forEach((p) => usedPlaceholders.add(p));
  }

  // Find unused global placeholders
  const unusedGlobalPlaceholders = globalPlaceholderKeys.filter((key) => !usedPlaceholders.has(key));

  if (unusedGlobalPlaceholders.length > 0) {
    warnings.push({
      type: "missing_placeholder",
      message: `Unused global placeholders: ${unusedGlobalPlaceholders.join(", ")}`,
      location: "globalPlaceholders",
      severity: "warning",
      suggestion: "Consider removing unused global placeholders to keep configuration clean",
    });
  }
}
