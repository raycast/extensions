// GENERATO da scripts/vendor.mjs — non modificare: modifica packages/ e rilancia `npm run vendor`.
/**
 * ApiClient: wrapper tipizzato su fetch per le API di Passig.
 *
 * - base URL configurabile (es. https://pass.example.com/api);
 * - bearer token automatico;
 * - su 401 esegue un refresh (`POST /auth/refresh`) con rotazione del refresh
 *   token, serializzando le richieste concorrenti (un solo refresh in volo),
 *   e ritenta la richiesta una volta;
 * - valida le risposte con gli schemi Zod condivisi;
 * - errori tipizzati (`ApiError`, `NetworkError`, `SessionExpiredError`).
 */
import { z } from "zod";
import {
  BillingStatus,
  BillingUrlResponse,
  CreateItemsBulkResponse,
  ErrorResponse,
  Item,
  LoginRequest,
  LoginResponse,
  OkResponse,
  PreloginResponse,
  TokenPair,
  UserSelf,
  Vault,
} from "../shared/index.js";
import { ApiError, NetworkError, PlanLimitError, ResponseFormatError, SessionExpiredError } from "./errors.js";

export interface Tokens {
  accessToken: string;
  refreshToken: string;
}

export interface ApiClientOptions {
  baseUrl: string;
  tokens?: Tokens | null;
  /** Implementazione di fetch (default: globalThis.fetch). */
  fetch?: typeof fetch;
  /** Invocata ogni volta che i token cambiano (refresh riuscito o sessione persa). */
  onTokensChanged?: (tokens: Tokens | null) => void | Promise<void>;
  /** Timeout per singola richiesta in millisecondi (default 20 s). */
  timeoutMs?: number;
  /**
   * Header aggiuntivi inviati con ogni richiesta (es. `Accept-Language` con la
   * lingua attiva del client). Una funzione viene valutata a ogni richiesta, così
   * il valore segue i cambi di lingua senza ricreare il client. `Accept`,
   * `Content-Type` e `Authorization` restano gestiti dal client.
   */
  headers?: Record<string, string> | (() => Record<string, string>);
}

interface RequestOptions<T> {
  body?: unknown;
  query?: Record<string, string | number | boolean | undefined>;
  schema?: z.ZodType<T>;
  /** false per endpoint pubblici (prelogin, login, refresh). */
  auth?: boolean;
  /** uso interno: evita loop di refresh. */
  _retried?: boolean;
}

type HttpMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";

/** Normalizza il base URL: aggiunge https:// se manca lo schema e rimuove slash finali. */
export function normalizeBaseUrl(input: string): string {
  let url = input.trim();
  if (!url) throw new Error("URL del server mancante");
  if (!/^https?:\/\//i.test(url)) url = `https://${url}`;
  // validazione
  const parsed = new URL(url);
  return parsed.toString().replace(/\/+$/, "");
}

export class ApiClient {
  readonly baseUrl: string;
  private tokens: Tokens | null;
  private readonly fetchImpl: typeof fetch;
  private readonly onTokensChanged?: ApiClientOptions["onTokensChanged"];
  private readonly timeoutMs: number;
  private readonly extraHeaders?: ApiClientOptions["headers"];
  private refreshInFlight: Promise<Tokens> | null = null;

  constructor(opts: ApiClientOptions) {
    this.baseUrl = normalizeBaseUrl(opts.baseUrl);
    this.tokens = opts.tokens ?? null;
    this.fetchImpl = opts.fetch ?? globalThis.fetch.bind(globalThis);
    this.onTokensChanged = opts.onTokensChanged;
    this.timeoutMs = opts.timeoutMs ?? 20_000;
    this.extraHeaders = opts.headers;
  }

  getTokens(): Tokens | null {
    return this.tokens;
  }

  async setTokens(tokens: Tokens | null): Promise<void> {
    this.tokens = tokens;
    await this.onTokensChanged?.(tokens);
  }

  get isAuthenticated(): boolean {
    return this.tokens !== null;
  }

  // ---------- core ----------

  async request<T = unknown>(method: HttpMethod, path: string, opts: RequestOptions<T> = {}): Promise<T> {
    const auth = opts.auth ?? true;
    if (auth && !this.tokens) throw new SessionExpiredError();

    const url = new URL(this.baseUrl + path);
    if (opts.query) {
      for (const [k, v] of Object.entries(opts.query)) {
        if (v !== undefined) url.searchParams.set(k, String(v));
      }
    }

    const extra = typeof this.extraHeaders === "function" ? this.extraHeaders() : this.extraHeaders;
    const headers: Record<string, string> = { ...extra, Accept: "application/json" };
    if (opts.body !== undefined) headers["Content-Type"] = "application/json";
    if (auth && this.tokens) headers.Authorization = `Bearer ${this.tokens.accessToken}`;

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.timeoutMs);
    let res: Response;
    try {
      res = await this.fetchImpl(url.toString(), {
        method,
        headers,
        body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
        signal: controller.signal,
        credentials: "omit",
      });
    } catch (err) {
      throw new NetworkError(`Impossibile contattare ${this.baseUrl}`, err);
    } finally {
      clearTimeout(timer);
    }

    if (res.status === 401 && auth && !opts._retried && this.tokens?.refreshToken) {
      // Access token scaduto: refresh con rotazione e un solo nuovo tentativo.
      await this.refresh();
      return this.request<T>(method, path, { ...opts, _retried: true });
    }

    if (!res.ok) throw await this.toApiError(res);

    if (res.status === 204) return undefined as T;
    const text = await res.text();
    const json: unknown = text ? JSON.parse(text) : undefined;
    if (opts.schema) {
      const parsed = opts.schema.safeParse(json);
      if (!parsed.success) throw new ResponseFormatError(path, parsed.error.issues);
      return parsed.data;
    }
    return json as T;
  }

  private async toApiError(res: Response): Promise<ApiError> {
    let payload: unknown;
    try {
      payload = await res.json();
    } catch {
      payload = undefined;
    }
    const parsed = ErrorResponse.safeParse(payload);
    if (parsed.success && res.status === 402) {
      return new PlanLimitError(parsed.data.error.code, parsed.data.error.message, parsed.data.error.details);
    }
    if (parsed.success) {
      return new ApiError(res.status, parsed.data.error.code, parsed.data.error.message, parsed.data.error.details);
    }
    return new ApiError(res.status, `HTTP_${res.status}`, res.statusText || `Errore HTTP ${res.status}`);
  }

  /**
   * Refresh con rotazione. Le richieste concorrenti condividono la stessa
   * promise: un solo `POST /auth/refresh` per volta (il server rileva il riuso
   * di un refresh token e revoca l'intera famiglia).
   */
  async refresh(): Promise<Tokens> {
    if (this.refreshInFlight) return this.refreshInFlight;
    const current = this.tokens;
    if (!current) throw new SessionExpiredError();

    this.refreshInFlight = (async () => {
      try {
        const pair = await this.request("POST", "/auth/refresh", {
          auth: false,
          body: { refreshToken: current.refreshToken },
          schema: TokenPair,
          _retried: true,
        });
        const next = { accessToken: pair.accessToken, refreshToken: pair.refreshToken };
        await this.setTokens(next);
        return next;
      } catch (err) {
        if (err instanceof ApiError && (err.status === 401 || err.status === 403 || err.status === 400)) {
          await this.setTokens(null);
          throw new SessionExpiredError();
        }
        throw err;
      } finally {
        this.refreshInFlight = null;
      }
    })();
    return this.refreshInFlight;
  }

  // ---------- auth ----------

  prelogin(email: string) {
    return this.request("POST", "/auth/prelogin", { auth: false, body: { email }, schema: PreloginResponse });
  }

  login(body: z.input<typeof LoginRequest>) {
    return this.request("POST", "/auth/login", { auth: false, body, schema: LoginResponse });
  }

  async logout(): Promise<void> {
    const refreshToken = this.tokens?.refreshToken;
    try {
      await this.request("POST", "/auth/logout", { body: { refreshToken }, schema: OkResponse });
    } catch {
      // best effort: la sessione locale viene comunque cancellata
    } finally {
      await this.setTokens(null);
    }
  }

  me() {
    return this.request("GET", "/me", { schema: UserSelf });
  }

  // ---------- vault & item ----------

  listVaults() {
    return this.request("GET", "/vaults", { schema: z.array(Vault) });
  }

  createVault(body: { name: string; organizationId?: string; encryptedVaultKey: string }) {
    return this.request("POST", "/vaults", { body, schema: Vault });
  }

  listItems(vaultId: string, opts: { since?: string; includeDeleted?: boolean } = {}) {
    return this.request("GET", `/vaults/${encodeURIComponent(vaultId)}/items`, {
      query: { since: opts.since, includeDeleted: opts.includeDeleted ? 1 : undefined },
      schema: z.array(Item),
    });
  }

  createItem(vaultId: string, data: string) {
    return this.request("POST", `/vaults/${encodeURIComponent(vaultId)}/items`, { body: { data }, schema: Item });
  }

  /** Creazione massiva (import): max `BULK_ITEMS_MAX` item per chiamata, tutto o niente. */
  createItemsBulk(vaultId: string, data: string[]) {
    return this.request("POST", `/vaults/${encodeURIComponent(vaultId)}/items/bulk`, {
      body: { items: data.map((d) => ({ data: d })) },
      schema: CreateItemsBulkResponse,
    });
  }

  updateItem(itemId: string, data: string, version: number) {
    return this.request("PUT", `/items/${encodeURIComponent(itemId)}`, { body: { data, version }, schema: Item });
  }

  deleteItem(itemId: string) {
    return this.request("DELETE", `/items/${encodeURIComponent(itemId)}`, { schema: OkResponse.optional() });
  }

  restoreItem(itemId: string) {
    return this.request("POST", `/items/${encodeURIComponent(itemId)}/restore`, { schema: Item });
  }

  // ---------- piano e pagamenti ----------

  billingStatus() {
    return this.request("GET", "/billing/status", { schema: BillingStatus });
  }

  /** URL di Stripe Checkout da aprire nel browser di sistema. */
  createCheckout() {
    return this.request("POST", "/billing/checkout", { schema: BillingUrlResponse });
  }

  /** URL del Customer Portal di Stripe (pagamento, fatture, disdetta). */
  createBillingPortal() {
    return this.request("POST", "/billing/portal", { schema: BillingUrlResponse });
  }
}
