import { ProtocolError } from "../../domain/errors";
import { isVerifiedRegistrationEndpoint } from "./dynamicRegistration";

export type OAuthTarget = "mcp" | "openapi";

export interface RegistrationStorage {
  getItem(key: string): Promise<string | undefined>;
  setItem(key: string, value: string): Promise<void>;
}

interface StoredRegistration {
  target: OAuthTarget;
  clientId: string;
  registrationEndpoint: string;
}

function storageKey(target: OAuthTarget): string {
  // v2: registrations made under v1 carried a redirect URI Raycast never
  // uses, so they are abandoned rather than migrated.
  return `ticktick.oauth.public-client.v2.${target}`;
}

function parse(value: string | undefined): StoredRegistration | undefined {
  if (!value) return undefined;
  try {
    const candidate: unknown = JSON.parse(value);
    if (typeof candidate !== "object" || candidate === null || Array.isArray(candidate)) return undefined;
    const record = candidate as Record<string, unknown>;
    if (
      Object.keys(record).sort().join(",") !== "clientId,registrationEndpoint,target" ||
      (record.target !== "mcp" && record.target !== "openapi") ||
      typeof record.clientId !== "string" ||
      record.clientId.trim().length === 0 ||
      record.clientId !== record.clientId.trim() ||
      typeof record.registrationEndpoint !== "string" ||
      !isVerifiedRegistrationEndpoint(record.registrationEndpoint)
    )
      return undefined;
    return { target: record.target, clientId: record.clientId, registrationEndpoint: record.registrationEndpoint };
  } catch {
    return undefined;
  }
}

export class OAuthClientRegistrationStore {
  constructor(private readonly storage: RegistrationStorage) {}

  async getOrRegister(
    target: OAuthTarget,
    registrationEndpoint: string,
    register: () => Promise<string>
  ): Promise<string> {
    if (!isVerifiedRegistrationEndpoint(registrationEndpoint)) {
      throw new ProtocolError("TickTick returned an unsafe dynamic registration endpoint.");
    }
    const key = storageKey(target);
    const existing = parse(await this.storage.getItem(key));
    if (existing?.target === target && existing.registrationEndpoint === registrationEndpoint) return existing.clientId;
    const clientId = (await register()).trim();
    if (!clientId) throw new Error("Dynamic client registration returned an empty client ID.");
    await this.storage.setItem(
      key,
      JSON.stringify({ target, clientId, registrationEndpoint } satisfies StoredRegistration)
    );
    return clientId;
  }
}
