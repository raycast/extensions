import data from "./registry.en.json";
import { createRegistry } from "./shared/registry";

export const { items: REGISTRY_ITEMS, entityTypes: ENTITY_TYPES } = createRegistry(data);
