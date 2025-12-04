type Locked = {
  weeks: number;
  count: number;
  tvl: number;
};
export type Result = {
  data: {
    count: {
      blocks: number;
      prices: number;
      tokens: number;
      masternodes: number;
    };
    burned: {
      address: number;
      fee: number;
      auction: number;
      payback: number;
      emission: number;
      total: number;
    };
    tvl: {
      dex: number;
      masternodes: number;
      loan: number;
      total: number;
    };
    price: {
      usd: number;
      usdt: number;
    };
    masternodes: {
      locked: Locked[];
    };
    loan: {
      count: {
        collateralTokens: number;
        loanTokens: number;
        openAuctions: number;
        openVaults: number;
        schemes: number;
      };
      value: {
        collateral: number;
        loan: number;
      };
    };
    emission: {
      masternode: number;
      dex: number;
      community: number;
      anchor: number;
      burned: number;
      total: number;
    };
    net: {
      version: number;
      subversion: string;
      protocolversion: number;
    };
    blockchain: {
      difficulty: number;
    };
  };
};
