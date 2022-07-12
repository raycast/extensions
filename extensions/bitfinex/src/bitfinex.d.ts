declare module "bitfinex-api-node" {
  type BFXOption = {
    apiKey?: string;
    apiSecret?: string;
    authToken?: string;
    company?: string;
    transform?: boolean;
    ws?: Record<string, unknown>;
    rest?: Record<string, unknown>;
  };

  type CallbackFn = (...args) => unknown;

  export = class BFX {
    constructor(opts?: BFXOption);
    rest(version?: 1 | 2, extraOpts? = {}): RestV2;
  };

  type LedgerFilters =
    | string
    | {
        ccy?: string;
        category?: number;
      };

  export class RestV2 {
    getURL(): string;
    usesAgent(): boolean;

    updateOrder(changes: Record<string, any>, cb?: CallbackFn): Promise<unknown>;

    trades(symbol = "tBTCUSD", start = null, end = null, limit = null, sort = null, cb?: CallbackFn): Promise<unknown>;

    fundingOffers(symbol = "fUSD", cb?: CallbackFn): Promise<unknown>;
    fundingOfferHistory(symbol?: string, start = null, end = null, limit = null, cb?: CallbackFn): Promise<unknown>;

    submitFundingOffer(offer: any, cb?: CallbackFn): Promise<unknown>;
    cancelFundingOffer(id: number, cb?: CallbackFn): Promise<unknown>;
    cancelAllFundingOffers(params: any, cb?: CallbackFn): Promise<unknown>;

    fundingCredits(symbol = "fUSD", cb?: CallbackFn): Promise<unknown>;
    fundingCreditHistory(symbol?: string, start = null, end = null, limit = null, cb?: CallbackFn): Promise<unknown>;

    fundingTrades(symbol = "fBTC", start = 0, end = Date.now(), limit = null, cb?: CallbackFn): Promise<unknown>;

    fundingLoans(symbol = "fUSD", cb?: CallbackFn): Promise<unknown>;
    fundingLoanHistory(symbol?, start = null, end = null, limit = null, cb?: CallbackFn): Promise<unknown>;

    closeFunding(params = {}, cb?: CallbackFn): Promise<unknown>;

    ledgers(filters?: LedgerFilters, start = null, end = Date.now(), limit = 25, cb?: CallbackFn): Promise<unknown>;

    calcAvailableBalance(
      symbol = "tBTCUSD",
      dir: number,
      rate: number,
      type: string,
      cb?: CallbackFn
    ): Promise<unknown>;
  }
}

declare module "bfx-api-node-models" {
  export class FundingOffer {
    constructor(data: any);
  }
}
