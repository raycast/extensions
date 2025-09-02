import { Icon } from "@raycast/api";

export const UI_CONSTANTS = {
  IMAGE_PREVIEW: {
    SIZE: 32,
    DEBOUNCE_DELAY: 500,
    SUPPORTED_FORMATS: ["png", "jpg", "jpeg", "gif", "svg", "webp"] as const,
  },
  ENTITY_ICONS: {
    TEMPLATE: Icon.Document,
    TONE: Icon.Person,
    MODEL: Icon.Stars,
    MANAGEMENT: Icon.Gear,
  },

  DEFAULT_ENTITY_ICON: Icon.Gear,
} as const;
