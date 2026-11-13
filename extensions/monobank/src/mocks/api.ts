import { ApiError, InvalidTokenError, RateLimitError } from "../api/monobank";
import { ClientInfoResponse, CurrencyRateResponse, StatementItemResponse } from "../api/types";
import { STATEMENT_MAX_PERIOD } from "../data/constants";
import { getMockClientInfo } from "./clientInfo";
import { MOCK_CONFIG } from "./config";
import { getMockRates } from "./rates";
import { getMockStatement } from "./statement";

// Mock versions of the requests in `src/api/monobank.ts`, with the same signatures minus the token.

async function respond<T>(path: string, personal: boolean, getData: () => T): Promise<T> {
  const [min, max] = MOCK_CONFIG.latency;
  await new Promise((resolve) => setTimeout(resolve, min + Math.random() * (max - min)));

  const { error } = MOCK_CONFIG;
  if (error === "network") throw new TypeError("fetch failed");
  if (personal && error === "invalidToken") throw new InvalidTokenError("Access token was rejected with status 403");
  if (personal && error === "rateLimit") throw new RateLimitError("Too many requests", path);
  if (personal && error === "server") throw new ApiError(500, "Internal server error", path);

  return getData();
}

/** When the last statement request was sent. Only this command's requests, like a real rate limit would see. */
let lastStatementAt = 0;

export function getClientInfo(): Promise<ClientInfoResponse> {
  return respond("/personal/client-info", true, () => getMockClientInfo(Date.now()));
}

export function getStatement(account: string, from: number, to?: number): Promise<StatementItemResponse[]> {
  const path = `/personal/statement/${account}/${from}${to !== undefined ? `/${to}` : ""}`;
  const sentAt = Date.now();
  // A second early, so timer jitter in the extension's own limiter doesn't trip it.
  const isLimited = sentAt - lastStatementAt < MOCK_CONFIG.statementRateLimit - 1000;
  lastStatementAt = sentAt;

  return respond(path, true, () => {
    if (isLimited) throw new RateLimitError("Too many requests", path);

    const end = to ?? Math.floor(Date.now() / 1000);
    if (end - from > STATEMENT_MAX_PERIOD) {
      throw new ApiError(400, "Period must be no more than 31 days and 1 hour", path);
    }

    const items = getMockStatement(account, from, to, Date.now());
    if (!items) throw new ApiError(400, "Account not found", path);
    return items;
  });
}

export function getCurrencyRates(): Promise<CurrencyRateResponse[]> {
  return respond("/bank/currency", false, () => getMockRates(Date.now()));
}
