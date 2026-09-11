import type { Capture } from "./captures";

/**
 * Builds the deep link used by the count-aware PRIMARY action:
 *   - exactly one total result -> open that specific capture
 *   - otherwise                -> open the gallery's search for the term
 */
export function primaryDeepLink(term: string, results: Capture[]): string {
    if (results.length === 1) {
        return `oh-shoot://capture/${results[0].id}`;
    }
    return `oh-shoot://search?q=${encodeURIComponent(term)}`;
}
