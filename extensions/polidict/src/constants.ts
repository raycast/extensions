/**
 * Backend validation limits for learning items and groups.
 * Must match FIELD_LIMITS in @polidict/shared (apps/shared/src/client/learning-items/model/form-schemas.ts).
 * Duplicated here because Raycast's build system doesn't support pnpm workspace dependencies.
 */
export const FIELD_LIMITS = {
  TEXT_MAX: 50,
  COMMENT_MAX: 300,
  IMAGE_URL_MAX: 300,
  DEFINITION_MAX: 300,
  TRANSLATION_MAX: 50,
  DEFINITION_COMMENT_MAX: 200,
  EXAMPLE_MAX: 200,
  GROUP_NAME_MAX: 50,
  GROUP_DESCRIPTION_MAX: 100,
} as const;

export const MAX_DEFINITIONS = 10;
export const MAX_EXAMPLES_PER_DEFINITION = 10;
