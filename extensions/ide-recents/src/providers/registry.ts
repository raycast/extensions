/**
 * Provider registry.
 *
 * To support another editor:
 * 1. create a provider file under providers/,
 * 2. import it here and add it to `allProviders`.
 */

import type { IDEProvider } from "./types";
import { vscodeProvider } from "./vscode";
import { traeProvider } from "./trae";
import { antigravityProvider } from "./antigravity";

export const allProviders: IDEProvider[] = [vscodeProvider, traeProvider, antigravityProvider];

/** Look up a provider by its id */
export function getProviderById(id: string): IDEProvider | undefined {
  return allProviders.find((provider) => provider.id === id);
}
