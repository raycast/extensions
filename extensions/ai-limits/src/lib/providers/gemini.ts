import { Deps } from "../deps";
import {
  asArray,
  asNumber,
  asRecord,
  asString,
  asTimestamp,
  clampPercent,
  decodeJwtPayload,
  requestJson,
} from "../http";
import { ProviderError, ProviderUsage, UsageWindow } from "../types";

const CODE_ASSIST_URL = "https://cloudcode-pa.googleapis.com/v1internal";
const TOKEN_URL = "https://oauth2.googleapis.com/token";

// Settings values that mean the CLI bills an API key, which has no plan quota to show.
const API_KEY_AUTH_TYPES = new Set(["gemini-api-key", "vertex-ai", "api-key"]);

// Refresh when the access token expires within a minute, so the requests don't race the expiry.
const EXPIRY_MARGIN_MS = 60_000;

const INSTALL_HINT =
  "Choose Connect Gemini CLI from this item's actions.\n" +
  "Or install Gemini CLI, then run `gemini` to sign in with Google";
const RELOGIN_HINT = "Run `gemini` once to refresh your login";
const CONSUMER_RETIRED_HINT =
  "Gemini CLI sign-in for personal Google accounts was retired in June 2026; use a Workspace or Code Assist Standard account";

// Where the Gemini CLI gets installed, as node_modules folders. The CLI's client id and secret live in its installed
// source, so this extension reads them from there and never ships Google's client credentials. Recent CLI releases are
// bundled, so the client may be in a chunk under bundle/ rather than in a single oauth2.js.
const NODE_MODULES_DIRS = [
  "/opt/homebrew/lib/node_modules",
  "/usr/local/lib/node_modules",
  "/opt/homebrew/opt/gemini-cli/libexec/lib/node_modules",
  "/usr/local/opt/gemini-cli/libexec/lib/node_modules",
];
const CLIENT_ID_PATTERN = /OAUTH_CLIENT_ID\s*=\s*['"]([^'"]+)['"]/;
const CLIENT_SECRET_PATTERN = /OAUTH_CLIENT_SECRET\s*=\s*['"]([^'"]+)['"]/;

interface GeminiCredentials {
  accessToken?: string;
  refreshToken?: string;
  idToken?: string;
  expiryMs?: number;
}

interface OAuthClient {
  id: string;
  secret: string;
}

// Gemini's quota comes from the CLI's own login, so no preference is read and the settings argument is not needed.
export async function fetchGeminiUsage(deps: Deps): Promise<ProviderUsage> {
  await assertGoogleLogin(deps);

  const credentials = await readCredentials(deps);
  const idClaims = decodeJwtPayload(credentials.idToken ?? "");
  const email = asString(idClaims?.email);
  const hostedDomain = asString(idClaims?.hd);

  const expiresSoon = credentials.expiryMs !== undefined && credentials.expiryMs <= deps.now() + EXPIRY_MARGIN_MS;
  const accessToken =
    credentials.accessToken && !expiresSoon ? credentials.accessToken : await refreshAccessToken(deps, credentials);

  const assist = await requestJson(deps, `${CODE_ASSIST_URL}:loadCodeAssist`, {
    method: "POST",
    headers: { Authorization: `Bearer ${accessToken}` },
    body: { metadata: { ideType: "IDE_UNSPECIFIED", platform: "PLATFORM_UNSPECIFIED", pluginType: "GEMINI" } },
    provider: "Gemini",
    authHint: RELOGIN_HINT,
  });
  const assistRecord = asRecord(assist);
  const project = projectId(assistRecord?.cloudaicompanionProject);
  const plan = tierPlan(assistRecord, hostedDomain);
  // Without a current tier, Google's consumer-account tier can mean the CLI is no longer served on personal accounts.
  const consumerUnsupported =
    asRecord(assistRecord?.currentTier) === undefined &&
    asArray(assistRecord?.ineligibleTiers).some((tier) => asRecord(tier)?.reasonCode === "UNSUPPORTED_CLIENT");

  let quota: unknown;
  try {
    quota = await requestJson(deps, `${CODE_ASSIST_URL}:retrieveUserQuota`, {
      method: "POST",
      headers: { Authorization: `Bearer ${accessToken}` },
      body: project ? { project } : {},
      provider: "Gemini",
      authHint: RELOGIN_HINT,
    });
  } catch (error) {
    if (consumerUnsupported && error instanceof ProviderError && error.status === 403) {
      throw new ProviderError(
        "auth",
        "Google no longer serves Gemini CLI quota for personal accounts",
        CONSUMER_RETIRED_HINT,
        undefined,
        "account-unsupported",
      );
    }
    throw error;
  }

  return {
    provider: "gemini",
    plan,
    account: email,
    windows: parseGeminiQuota(quota),
    balances: [],
    notes: [],
    source: "Gemini CLI login",
    fetchedAt: deps.now(),
  };
}

// Rejects the API-key modes up front: the quota endpoint only answers for a Google login. A missing or unreadable
// settings file is normal, so it never stops the check.
async function assertGoogleLogin(deps: Deps): Promise<void> {
  let text: string | null;
  try {
    text = await deps.readFile(`${deps.homedir}/.gemini/settings.json`);
  } catch {
    return;
  }
  if (text === null) {
    return;
  }
  let settings: unknown;
  try {
    settings = JSON.parse(text);
  } catch {
    return;
  }
  const root = asRecord(settings);
  const authType = asString(asRecord(asRecord(root?.security)?.auth)?.selectedType) ?? asString(root?.selectedAuthType);
  if (authType && API_KEY_AUTH_TYPES.has(authType)) {
    throw new ProviderError(
      "not-connected",
      "Gemini CLI uses an API key",
      "Plan quota needs a Google login. Run `gemini`, choose /auth and Sign in with Google",
    );
  }
}

async function readCredentials(deps: Deps): Promise<GeminiCredentials> {
  const notConnected = new ProviderError("not-connected", "Gemini CLI isn't signed in", INSTALL_HINT);
  const text = await deps.readFile(`${deps.homedir}/.gemini/oauth_creds.json`);
  if (text === null) {
    throw notConnected;
  }
  let json: unknown;
  try {
    json = JSON.parse(text);
  } catch {
    throw notConnected;
  }
  const record = asRecord(json);
  if (!record) {
    throw notConnected;
  }
  return {
    accessToken: asString(record.access_token),
    refreshToken: asString(record.refresh_token),
    idToken: asString(record.id_token),
    expiryMs: asNumber(record.expiry_date),
  };
}

// Refreshes the access token in memory only. Google's refresh tokens don't rotate, so this never signs the CLI out, and
// the CLI's credentials file is left as it is.
async function refreshAccessToken(deps: Deps, credentials: GeminiCredentials): Promise<string> {
  const expired = new ProviderError("auth", "Gemini login expired", RELOGIN_HINT);
  if (!credentials.refreshToken) {
    throw expired;
  }
  const client = await findOAuthClient(deps);
  if (!client) {
    throw expired;
  }

  let json: unknown;
  try {
    json = await requestJson(deps, TOKEN_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: client.id,
        client_secret: client.secret,
        refresh_token: credentials.refreshToken,
        grant_type: "refresh_token",
      }).toString(),
      provider: "Google",
    });
  } catch (error) {
    // Google answers a revoked or invalid refresh token with 400 (invalid_grant) or 401. Only that means the login is
    // over. Network failures and other statuses are real errors and pass through unchanged.
    if (error instanceof ProviderError && (error.status === 400 || error.status === 401)) {
      throw expired;
    }
    throw error;
  }

  const accessToken = asString(asRecord(json)?.access_token);
  if (!accessToken) {
    throw new ProviderError("parse", "Google's token answer had no access token");
  }
  return accessToken;
}

// The OAuth client id and secret come from the environment, or from the Gemini CLI installed on this Mac. The client
// is the CLI's own public client, so its values are read rather than copied here.
async function findOAuthClient(deps: Deps): Promise<OAuthClient | undefined> {
  const envId = asString(deps.env.GEMINI_OAUTH_CLIENT_ID);
  const envSecret = asString(deps.env.GEMINI_OAUTH_CLIENT_SECRET);
  if (envId && envSecret) {
    return { id: envId, secret: envSecret };
  }

  // Stops at the first file that has both values, so the common install is found after one or two reads.
  for await (const path of clientCandidatePaths(deps)) {
    const text = await readOptional(deps, path);
    if (text === null) {
      continue;
    }
    const id = CLIENT_ID_PATTERN.exec(text)?.[1];
    const secret = CLIENT_SECRET_PATTERN.exec(text)?.[1];
    if (id && secret) {
      return { id, secret };
    }
  }
  return undefined;
}

// Every place the CLI's OAuth client might be, in the order to look: each install's source file, then its bundled
// chunks.
async function* clientCandidatePaths(deps: Deps): AsyncGenerator<string> {
  for (const nodeModules of await nodeModulesDirs(deps)) {
    const root = `${nodeModules}/@google/gemini-cli`;
    yield `${root}/dist/src/code_assist/oauth2.js`;
    yield `${root}/node_modules/@google/gemini-cli-core/dist/src/code_assist/oauth2.js`;
    for (const name of await listOptional(deps, `${root}/bundle`)) {
      if (name.endsWith(".js")) {
        yield `${root}/bundle/${name}`;
      }
    }
  }
}

// The node_modules folders of every known install: Homebrew, the npm and Volta global installs, and each nvm Node.
async function nodeModulesDirs(deps: Deps): Promise<string[]> {
  const home = deps.homedir;
  const nvmVersions = await listOptional(deps, `${home}/.nvm/versions/node`);
  return [
    ...NODE_MODULES_DIRS,
    `${home}/.npm-global/lib/node_modules`,
    `${home}/.volta/tools/image/packages/@google/gemini-cli/lib/node_modules`,
    ...nvmVersions.map((version) => `${home}/.nvm/versions/node/${version}/lib/node_modules`),
  ];
}

// An unreadable file is treated as absent: the CLI's install location is guesswork, so one bad path must not stop the
// search.
async function readOptional(deps: Deps, path: string): Promise<string | null> {
  try {
    return await deps.readFile(path);
  } catch {
    return null;
  }
}

async function listOptional(deps: Deps, path: string): Promise<string[]> {
  try {
    return (await deps.listDir(path)) ?? [];
  } catch {
    return [];
  }
}

// The project id is a string in some responses and an object with an id in others.
function projectId(value: unknown): string | undefined {
  return asString(value) ?? asString(asRecord(value)?.id);
}

function tierPlan(response: Record<string, unknown> | undefined, hostedDomain: string | undefined): string | undefined {
  const paid = asString(asRecord(response?.paidTier)?.name);
  if (paid) {
    return paid;
  }
  const current = asRecord(response?.currentTier);
  const currentId = asString(current?.id);
  return (currentId && tierNameForId(currentId, hostedDomain)) ?? asString(current?.name);
}

function tierNameForId(id: string, hostedDomain: string | undefined): string | undefined {
  switch (id) {
    case "standard-tier":
      return "Paid";
    case "free-tier":
      // A free tier on a Workspace domain is the Workspace plan, not a personal free account.
      return hostedDomain ? "Workspace" : "Free";
    case "legacy-tier":
      return "Legacy";
    default:
      return undefined;
  }
}

// Turns the quota buckets into one window per model family. A model can have several buckets (one per token type), so
// the most-used bucket of each model wins, then the most-used model of each family.
export function parseGeminiQuota(json: unknown): UsageWindow[] {
  const perModel = new Map<string, { fraction: number; resetsAt: number | null }>();
  for (const raw of asArray(asRecord(json)?.buckets)) {
    const bucket = asRecord(raw);
    const modelId = asString(bucket?.modelId);
    const fraction = asNumber(bucket?.remainingFraction);
    if (!modelId || fraction === undefined) {
      continue;
    }
    const current = perModel.get(modelId);
    if (!current || fraction < current.fraction) {
      perModel.set(modelId, { fraction, resetsAt: asTimestamp(bucket?.resetTime) });
    }
  }

  const families = new Map<string, { modelId: string; fraction: number; resetsAt: number | null }>();
  for (const [modelId, { fraction, resetsAt }] of perModel) {
    const family = familyOf(modelId);
    const current = families.get(family);
    if (!current || fraction < current.fraction) {
      families.set(family, { modelId, fraction, resetsAt });
    }
  }
  if (families.size === 0) {
    throw new ProviderError("parse", "Gemini's quota response had no usable buckets");
  }

  return [...families.entries()]
    .sort(([a], [b]) => familyRank(a) - familyRank(b) || a.localeCompare(b))
    .map(([label, { modelId, fraction, resetsAt }]) => ({
      label,
      usedPercent: clampPercent((1 - fraction) * 100),
      resetsAt,
      detail: modelId,
    }));
}

// Flash Lite must be checked before Flash, since its id contains "flash" too.
function familyOf(modelId: string): string {
  const id = modelId.toLowerCase();
  if (id.includes("flash-lite")) {
    return "Flash Lite";
  }
  if (id.includes("flash")) {
    return "Flash";
  }
  if (id.includes("pro")) {
    return "Pro";
  }
  return modelId;
}

const FAMILY_ORDER = ["Pro", "Flash", "Flash Lite"];

function familyRank(label: string): number {
  const index = FAMILY_ORDER.indexOf(label);
  return index === -1 ? FAMILY_ORDER.length : index;
}
