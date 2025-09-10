import { useCallback, useMemo } from "react";
import { BaseCustomEntity, CustomEntityInput, CustomEntityUpdate, PromptTemplate } from "../types";
import { messages } from "@/locale/en/messages";
import { TEMPLATE_TYPES } from "@/constants";
import { useEntityManager } from "./useEntityManager";
import { BUILT_IN_TEMPLATES } from "@/templates/built-in-templates";

export interface CustomTemplate extends BaseCustomEntity {
  name: string;
  icon?: string;
  sections?: {
    instructions: string;
    requirements?: string;
    output?: string;
  };
}

// Custom format - exists only in memory, never persisted
const CUSTOM_TEMPLATE: CustomTemplate = {
  id: TEMPLATE_TYPES.CUSTOM,
  name: messages.ui.templates.custom,
  icon: undefined,
  sections: {
    instructions: "",
  },
  isBuiltIn: false,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

/**
 * Converts a PromptTemplate to CustomTemplate
 * Excludes context section as it's now handled dynamically
 */
const promptTemplateToCustomTemplate = (template: PromptTemplate): CustomTemplate => ({
  id: template.id,
  name: template.name,
  icon: template.icon,
  sections: {
    instructions: template.sections.instructions,
    requirements: template.sections.requirements,
    output: template.sections.output,
  },
  isBuiltIn: template.isBuiltIn,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
});

// Built-in templates for initial bootstrap
const BUILT_IN_TEMPLATES_DATA: CustomTemplate[] = [
  promptTemplateToCustomTemplate(BUILT_IN_TEMPLATES.slack),
  promptTemplateToCustomTemplate(BUILT_IN_TEMPLATES["code-review"]),
  promptTemplateToCustomTemplate(BUILT_IN_TEMPLATES.email),
  promptTemplateToCustomTemplate(BUILT_IN_TEMPLATES["bug-report"]),
  promptTemplateToCustomTemplate(BUILT_IN_TEMPLATES["technical-docs"]),
];

interface UseCustomTemplatesReturn {
  templates: CustomTemplate[];
  allTemplates: CustomTemplate[];
  isLoading: boolean;
  addTemplate: (template: CustomEntityInput<CustomTemplate>) => Promise<CustomTemplate>;
  updateTemplate: (id: string, updates: CustomEntityUpdate<CustomTemplate>) => Promise<CustomTemplate | undefined>;
  deleteTemplate: (id: string) => Promise<void>;
  getTemplateById: (id: string) => CustomTemplate | undefined;
  refreshTemplates: () => void;
}

/**
 * Manages custom text formatting configurations with CRUD operations and localStorage persistence.
 */
export function useCustomTemplates(): UseCustomTemplatesReturn {
  // Memoize entity manager configuration for performance
  const entityManagerConfig = useMemo(
    () => ({
      storageKey: "templates",
      builtInEntities: BUILT_IN_TEMPLATES_DATA,
      createEntityId: () => `template-${Date.now()}`,
    }),
    []
  );

  const entityManager = useEntityManager<CustomTemplate>(entityManagerConfig);

  // Include custom template in allTemplates for dropdown
  const allTemplates = useMemo(() => [CUSTOM_TEMPLATE, ...entityManager.allEntities], [entityManager.allEntities]);

  const addTemplate = useCallback(
    async (templateData: CustomEntityInput<CustomTemplate>): Promise<CustomTemplate> => {
      return entityManager.addEntity(templateData);
    },
    [entityManager.addEntity]
  );

  const updateTemplate = useCallback(
    async (id: string, updates: CustomEntityUpdate<CustomTemplate>): Promise<CustomTemplate | undefined> => {
      return entityManager.updateEntity(id, updates);
    },
    [entityManager.updateEntity]
  );

  const getTemplateById = useCallback(
    (id: string): CustomTemplate | undefined => {
      if (id === TEMPLATE_TYPES.CUSTOM) {
        return CUSTOM_TEMPLATE;
      }
      return entityManager.getEntityById(id);
    },
    [entityManager.getEntityById]
  );

  return {
    templates: entityManager.entities,
    allTemplates,
    isLoading: entityManager.isLoading,
    addTemplate,
    updateTemplate: updateTemplate,
    deleteTemplate: entityManager.deleteEntity,
    getTemplateById: getTemplateById,
    refreshTemplates: entityManager.refreshEntities,
  };
}
