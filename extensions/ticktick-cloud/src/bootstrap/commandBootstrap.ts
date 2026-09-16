import { randomUUID } from "node:crypto";

import { getPreferenceValues, openExtensionPreferences } from "@raycast/api";
import moment from "moment-timezone";

import type { CommandRuntimeBootstrap, ReadyCommandRuntimeInput } from "../application/commandRuntime";
import { createReadyCommandRuntime } from "../application/commandRuntime";
import type { CreateTaskInput } from "../domain/task";
import type { AuthProvider } from "../infrastructure/auth/AuthProvider";
import { ApiTokenAuthProvider } from "../infrastructure/auth/ApiTokenAuthProvider";
import { OAuthAuthProvider } from "../infrastructure/auth/OAuthAuthProvider";
import { OAuthClientRegistrationStore } from "../infrastructure/auth/OAuthClientRegistrationStore";
import { OAuthSessionKeyStore } from "../infrastructure/auth/OAuthSessionKeyStore";
import { RaycastOAuthClient } from "../infrastructure/auth/RaycastOAuthClient";
import { RaycastRegistrationStorage } from "../infrastructure/auth/RaycastRegistrationStorage";
import { AUTHORIZATION_ENDPOINT, TOKEN_ENDPOINT, discoverOAuthMetadata } from "../infrastructure/auth/oauthMetadata";
import { registerPublicClient } from "../infrastructure/auth/dynamicRegistration";
import type { TickTickBackend } from "../infrastructure/backend/TickTickBackend";
import type { CachePort } from "../infrastructure/cache/CachePort";
import { RaycastCachePort } from "../infrastructure/cache/RaycastCachePort";
import { TaskRepository } from "../infrastructure/cache/TaskRepository";
import { selectTickTickBackend } from "../infrastructure/BackendFactory";
import { createMcpClient } from "../infrastructure/mcp/createMcpClient";
import { McpTickTickBackend } from "../infrastructure/mcp/McpTickTickBackend";
import { resolveAuthMode, type AuthMode } from "../platform/preferences";
import type { AiToolRuntime } from "../tools/toolController";

interface AuthProviderContext {
  readonly readPreferences: () => Preferences;
  readonly clearAccount: (accountKey: string) => Promise<void>;
}

export interface CommandBootstrapPorts {
  readonly readPreferences?: () => Preferences;
  readonly cachePort?: CachePort;
  readonly createRemoteBackend?: (auth: AuthProvider) => TickTickBackend;
  readonly createAuthProvider?: (mode: AuthMode, context: AuthProviderContext) => AuthProvider;
  readonly openPreferences?: () => unknown | Promise<unknown>;
}

export function resolveUiTimeZone(): string {
  return moment.tz.guess();
}

export function createTickTickCommandBootstrap(ports: CommandBootstrapPorts = {}): CommandRuntimeBootstrap {
  let pending: Promise<ReadyCommandRuntimeInput> | undefined;
  return () => {
    if (!pending) {
      const composed = composeReadyCommandRuntimeInput(ports).catch((error) => {
        if (pending === composed) pending = undefined;
        throw error;
      });
      pending = composed;
    }
    return pending;
  };
}

/**
 * The single production bootstrap shared by every command entry point. The
 * memo keeps one backend session and one repository per command process.
 */
export const bootstrapTickTickCommandRuntime: CommandRuntimeBootstrap = createTickTickCommandBootstrap();

export async function loadTickTickAiToolRuntime(
  bootstrap: CommandRuntimeBootstrap = bootstrapTickTickCommandRuntime
): Promise<AiToolRuntime> {
  const runtime = createReadyCommandRuntime(await bootstrap());
  return Object.freeze({
    backendId: runtime.backendId,
    accountKey: runtime.accountKey,
    capabilities: Object.freeze({ create: runtime.capabilities.create }),
    taskService: runtime.taskService,
    createTask: (input: CreateTaskInput) => runtime.creationService.create(runtime.accountKey, input),
  });
}

async function composeReadyCommandRuntimeInput(ports: CommandBootstrapPorts): Promise<ReadyCommandRuntimeInput> {
  const readPreferences = ports.readPreferences ?? readRaycastPreferences;
  const authMode = resolveAuthMode(readPreferences().authMode);
  const repository = new TaskRepository(ports.cachePort ?? new RaycastCachePort());
  const openPreferences = ports.openPreferences ?? (() => openExtensionPreferences());
  const onOpenPreferences = () => void openPreferences();

  const auth = (ports.createAuthProvider ?? createProductionAuthProvider)(authMode, {
    readPreferences,
    clearAccount: async (accountKey) => repository.clearAccount(accountKey),
  });
  const backend = await selectTickTickBackend({
    loadReleaseRemote: () => (ports.createRemoteBackend ?? createProductionRemoteBackend)(auth),
  });
  const accountKey = (await backend.accountIdentity()) ?? (await auth.accountCacheKey());

  const onReconnect =
    authMode === "oauth"
      ? async () => {
          await auth.invalidate();
          await auth.getAccessToken();
        }
      : onOpenPreferences;
  return { backend, accountKey, repository, onReconnect, onOpenPreferences };
}

function createProductionRemoteBackend(auth: AuthProvider): TickTickBackend {
  return new McpTickTickBackend({ createClient: () => createMcpClient(auth) });
}

function createProductionAuthProvider(mode: AuthMode, context: AuthProviderContext): AuthProvider {
  if (mode === "apiToken") return new ApiTokenAuthProvider("mcp", context.readPreferences);

  const clientId = memoize(async () => {
    const metadata = await discoverOAuthMetadata();
    const registrations = new OAuthClientRegistrationStore(new RaycastRegistrationStorage());
    return registrations.getOrRegister("mcp", metadata.registrationEndpoint, () =>
      registerPublicClient(metadata.registrationEndpoint)
    );
  });

  return new OAuthAuthProvider({
    target: "mcp",
    // Live metadata is re-verified during clientId discovery, which rejects
    // any endpoint drift with a protocol error before authorization begins.
    endpoints: { authorizationEndpoint: AUTHORIZATION_ENDPOINT, tokenEndpoint: TOKEN_ENDPOINT },
    clientId,
    client: new RaycastOAuthClient("mcp"),
    fetch: (input, init) => fetch(input, init),
    sessionStore: new OAuthSessionKeyStore("mcp"),
    randomUUID,
    clearAccount: context.clearAccount,
  });
}

function readRaycastPreferences(): Preferences {
  return getPreferenceValues<Preferences>();
}

function memoize<Value>(load: () => Promise<Value>): () => Promise<Value> {
  let pending: Promise<Value> | undefined;
  return () => {
    if (!pending) {
      const loading = load().catch((error) => {
        if (pending === loading) pending = undefined;
        throw error;
      });
      pending = loading;
    }
    return pending;
  };
}
