
export type ResultData = {
  data: {
    cryptoCurrencyMap: CryptoCurrency[]
  },
  status: {
    timestamp: string
  }
}


export type CryptoCurrency = {
    name: string,
    slug: string,
    symbol: string
  }

export type CryptoList = {
  name: string,
  slug: string,
  symbol: string
}

export type SearchResult = {
  obj: CryptoList,
  currencyPrice?: string,
  priceDiff?: string
}
