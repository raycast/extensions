import { environment } from "@raycast/api";

/**
 * Dev-only diagnostic logging. Production builds carry no console output;
 * during `npm run dev` lines surface in the terminal as `glm-models: …`.
 */
export function log(message: string): void {
  if (environment.isDevelopment) {
    console.log(`glm-models: ${message}`);
  }
}
