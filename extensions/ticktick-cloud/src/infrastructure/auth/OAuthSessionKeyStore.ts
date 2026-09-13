import { createRequire } from "node:module";

import type { AuthTarget } from "./AuthProvider";

export interface OAuthSessionKeyStorePort {
  get(): Promise<string | undefined>;
  set(key: string): Promise<void>;
  remove(): Promise<void>;
}
export interface LocalStoragePort {
  getItem(key: string): Promise<string | undefined>;
  setItem(key: string, value: string): Promise<void>;
  removeItem(key: string): Promise<void>;
}

const sessionKeyPattern = /^oauth:[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
export function isOAuthSessionKey(value: unknown): value is string {
  return typeof value === "string" && sessionKeyPattern.test(value);
}
function defaultStorage(): LocalStoragePort {
  return createRequire(__filename)("@raycast/api").LocalStorage as LocalStoragePort;
}

export class OAuthSessionKeyStore implements OAuthSessionKeyStorePort {
  private readonly key: string;
  constructor(target: AuthTarget, private readonly storage: LocalStoragePort = defaultStorage()) {
    this.key = `ticktick.oauth.session.v1.${target}`;
  }
  async get(): Promise<string | undefined> {
    const value = await this.storage.getItem(this.key);
    if (value === undefined || isOAuthSessionKey(value)) return value;
    await this.storage.removeItem(this.key);
    return undefined;
  }
  async set(value: string): Promise<void> {
    if (!isOAuthSessionKey(value)) throw new Error("OAuth session key is invalid.");
    await this.storage.setItem(this.key, value);
  }
  remove(): Promise<void> {
    return this.storage.removeItem(this.key);
  }
}
