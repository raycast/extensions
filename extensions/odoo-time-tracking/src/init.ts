/**
 * One-time initialization of the Odoo API storage backend.
 * Call ensureInitialized() before using any Odoo API functions.
 */

import { initStorage } from "./utils/odoo";
import { raycastStorage } from "./adapters/raycast-storage";

let initialized = false;

export function ensureInitialized(): void {
  if (!initialized) {
    initStorage(raycastStorage);
    initialized = true;
  }
}
