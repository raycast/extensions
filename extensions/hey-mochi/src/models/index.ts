export type PromptType = 'chain-info' | 'gas-track' | 'token-trend' | 'token-info'

export type GeneratedAction = {
  endpoint: string
  description: string
  type: PromptType
}

export type TokenTrending = {
  data: {
    coins: {
      item: {
        id: string
        coin_id: number
        name: string
        symbol: string
        market_cap_rank: number
        thumb: string
        small: string
        large: string
        slug: string
        price_btc: number
        score: number
      }
    }[]
  }
}

export type TokenInfomation = {
  data: {
    id: string
    name: string
    symbol: string
    market_cap_rank: number
    asset_platform_id: string
    image: {
      thumb: string
      small: string
      large: string
    }
    market_data: {
      current_price: {
        bits: number
        bnb: number
        btc: number
        dot: number
        eth: number
        ltc: number
        thb: number
        try: number
        usd: number
        vef: number
        vnd: number
        xdr: number
        xlm: number
        xrp: number
      }
    }
  }
}

export type ChainInfomation = {
  data: {
    id: number
    name: string
    short_name: string
    coin_gecko_id: string
    currency: string
  }[]
}

export type ChainInformationWithTokenInformation = {
  id: number
  name: string
  short_name: string
  coin_gecko_id: string
  currency: string
  token: TokenInfomation['data'] | undefined
}

export type GasTrackerInfomation = {
  data: {
    chain: string
    safe_gas_price: string
    propose_gas_price: string
    fast_gas_price: string
    est_safe_time: string
    est_propose_time: string
    est_fast_time: string
  }[]
}

export type CoinQuery = {
  data: {
    id: string
    symbol: string
    name: string
  }[]
}
