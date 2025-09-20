import { Schema } from 'effect'

export const Balance = Schema.Array(
  Schema.Struct({
    symbol: Schema.String.pipe(
      Schema.annotations({
        description: 'The asset for which the balance was returned.',
        example: 'BTC',
      }),
    ),
    available: Schema.String.pipe(
      Schema.annotations({
        description: 'The balance what is available for use.',
        example: '1.57593193',
      }),
    ),
    inOrder: Schema.String.pipe(
      Schema.annotations({
        description: 'The balance that is currently reserved for open orders.',
        example: '0.74832374',
      }),
    ),
  }),
)

export const Trades = Schema.Array(
  Schema.Struct({
    id: Schema.String.pipe(
      Schema.annotations({
        description: 'The identifier of the fill, unique per market.',
        example: '108c3633-0276-4480-a902-17a01829deae',
      }),
    ),
    orderId: Schema.String.pipe(
      Schema.annotations({
        description: 'Bitvavo identifier of the order that was filled.',
        example: '1d671998-3d44-4df4-965f-0d48bd129a1b',
      }),
    ),
    clientOrderId: Schema.optional(
      Schema.String.pipe(
        Schema.annotations({
          description: 'Your identifier of the order that was filled.',
          example: '2be7d0df-d8dc-7b93-a550-8876f3b393e9',
        }),
      ),
    ),
    timestamp: Schema.Number.pipe(
      Schema.annotations({
        description: 'The Unix timestamp when the trade was made.',
        example: 1542967486256,
      }),
    ),
    market: Schema.String.pipe(
      Schema.annotations({
        description: 'The market for which to return past trades.',
        example: 'BTC-EUR',
      }),
    ),
    side: Schema.Literal('sell', 'buy').pipe(
      Schema.annotations({
        description:
          'Indicates if the taker, who filled the order, is selling or buying.',
        example: 'buy',
      }),
    ),
    amount: Schema.String.pipe(
      Schema.annotations({
        description: 'The amount of base currency exchanged in the trade.',
        example: '0.005',
      }),
    ),
    price: Schema.String.pipe(
      Schema.annotations({
        description:
          'The price of 1 unit of base currency in the amount of quote currency at the time of the trade.',
        example: '5000.1',
      }),
    ),
    taker: Schema.Boolean.pipe(
      Schema.annotations({
        description:
          'Indicates whether you are the taker for the fill. If true, you are the one who placed the order that was filled by another party.',
        example: true,
      }),
    ),
    fee: Schema.String.pipe(
      Schema.annotations({
        description:
          'The fee that was paid. Value is negative for rebates. Only available if settled is true.',
        example: '0.03',
      }),
    ),
    feeCurrency: Schema.String.pipe(
      Schema.annotations({
        description:
          'Currency in which the fee was paid. Only available if settled is true.',
        example: 'EUR',
      }),
    ),
    settled: Schema.Boolean.pipe(
      Schema.annotations({
        description:
          'Indicates whether the fee was deducted and the exchanged currency is available for further trading.',
        example: true,
      }),
    ),
  }),
).pipe(
  Schema.annotations({
    description: 'Array of trades executed in the specified market.',
  }),
)

export const Ticker24h = Schema.Struct({
  timestamp: Schema.Number.pipe(
    Schema.annotations({
      description: 'The Unix timestamp when the ticker was last updated.',
      example: 1542967486256,
    }),
  ),
  market: Schema.String.pipe(
    Schema.annotations({
      description: 'The market for which the ticker is provided.',
      example: 'BTC-EUR',
    }),
  ),
  bid: Schema.String.pipe(
    Schema.annotations({
      description: 'The highest bid price at the moment.',
      example: '100550',
    }),
  ),
  ask: Schema.String.pipe(
    Schema.annotations({
      description: 'The lowest ask price at the moment.',
      example: '100560',
    }),
  ),
}).pipe(
  Schema.annotations({
    description:
      'Ticker information for a market, including prices and volumes over the last 24 hours.',
  }),
)

export const Asset = Schema.Struct({
  symbol: Schema.String.pipe(
    Schema.annotations({
      description: 'The asset symbol.',
      example: 'BTC',
    }),
  ),
  market: Schema.String.pipe(
    Schema.annotations({
      description: 'The market for the asset.',
      example: 'BTC-EUR',
    }),
  ),
  currentBalance: Schema.Number.pipe(
    Schema.annotations({
      description: 'The current balance of the asset.',
      example: 1.5,
    }),
  ),
  averageBuyPrice: Schema.Number.pipe(
    Schema.annotations({
      description: 'The average buy price of the asset.',
      example: 30000,
    }),
  ),
  currentPrice: Schema.Number.pipe(
    Schema.annotations({
      description: 'The current price of the asset.',
      example: 35000,
    }),
  ),
  totalValue: Schema.Number.pipe(
    Schema.annotations({
      description: 'The total value of the asset at current price.',
      example: 52500,
    }),
  ),
  totalInvested: Schema.Number.pipe(
    Schema.annotations({
      description: 'The total amount invested in the asset.',
      example: 45000,
    }),
  ),
  gainLoss: Schema.Number.pipe(
    Schema.annotations({
      description:
        'The gain or loss from the investment in the asset, calculated as totalValue - totalInvested.',
      example: 7500,
    }),
  ),
  gainLossPercent: Schema.Number.pipe(
    Schema.annotations({
      description:
        'The percentage gain or loss from the investment in the asset, calculated as (gainLoss / totalInvested) * 100.',
      example: 16.67,
    }),
  ),
})

export type Asset = typeof Asset.Type

export const Summary = Schema.Struct({
  totals: Schema.Struct({
    invested: Schema.Number.pipe(
      Schema.annotations({
        description: 'Total amount invested across all assets.',
        example: 45000,
      }),
    ),
    currentValue: Schema.Number.pipe(
      Schema.annotations({
        description: 'Total current value of all assets.',
        example: 52500,
      }),
    ),
    gainLoss: Schema.Number.pipe(
      Schema.annotations({
        description: 'Total gain or loss across all assets.',
        example: 7500,
      }),
    ),
    gainLossPercent: Schema.Number.pipe(
      Schema.annotations({
        description: 'Total percentage gain or loss across all assets.',
        example: 16.67,
      }),
    ),
  }),
  assets: Schema.Array(Asset).pipe(
    Schema.annotations({
      description:
        'Array of asset summaries, each containing detailed information about an asset.',
    }),
  ),
}).pipe(
  Schema.annotations({
    description:
      'Summary of the portfolio, including total investments and individual asset summaries.',
  }),
)
