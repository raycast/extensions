import { environment } from "@raycast/api";

/** Whether dev diagnostics run at all — production Store builds carry no
 * console output and skip their bookkeeping (LocalStorage I/O included). */
export const isDevelopment = environment.isDevelopment;

/**
 * Dev-only diagnostic logging. Production builds carry no console output;
 * during `npm run dev` lines surface in the terminal as
 * `alibaba-model-studio: …`.
 */
export function log(message: string): void {
  if (isDevelopment) {
    console.log(`alibaba-model-studio: ${message}`);
  }
}
