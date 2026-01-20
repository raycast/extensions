import { Root, Templateable } from "./types";

export interface ValidationError {
  type: "missing_placeholder" | "invalid_template" | "invalid_url" | "missing_template";
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

function extractPlaceholders(templateUrl: string): string[] {
  if (!templateUrl) return [];

  const matches = templateUrl.match(/\$\{([^{}]+)\}/g);
  if (!matches) return [];
  return matches.map((match) => match.slice(2, -1));
}
