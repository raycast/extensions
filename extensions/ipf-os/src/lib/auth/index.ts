import { BrowserHandoffAuthProvider } from "./browser-handoff";
import type { AuthProvider } from "./provider";

let provider: AuthProvider | undefined;

export function getAuthProvider(): AuthProvider {
  if (!provider) {
    provider = new BrowserHandoffAuthProvider();
  }
  return provider;
}

export type { AuthProvider, AuthSession } from "./provider";
