/* eslint-disable @typescript-eslint/no-require-imports */
import {
  Array,
  Chunk,
  Config,
  Console,
  Effect,
  Order,
  pipe,
  PubSub,
  Schedule,
  Schema,
  Stream,
} from 'effect'
import { BitvavoSdkError } from './errors'
import { getSummary } from './getSummary'
import { Balance, Ticker24h, Trades } from './schema'

export class PortfolioStreamService extends Effect.Service<PortfolioStreamService>()(
  'coiny/PortfolioStreamService',
  {
    accessors: true,
    dependencies: [],
    effect: Effect.gen(function* () {
      const apiKey = yield* Config.string('BITVAVO_API_KEY')
      const apiSecret = yield* Config.string('BITVAVO_API_SECRET')
      const apiRestUrl = yield* Config.string('BITVAVO_API_REST_URL')
      const apiWsUrl = yield* Config.string('BITVAVO_API_WS_URL')
      const bitvavo = require('bitvavo')().options({
        APIKEY: apiKey,
        APISECRET: apiSecret,
        ACCESSWINDOW: 10000,
        RESTURL: apiRestUrl,
        WSURL: apiWsUrl,
        DEBUGGING: false,
      })
      const retrySchedule = Schedule.intersect(
        Schedule.exponential('100 millis'),
        Schedule.recurs(3),
      )

      const setup = () =>
        Effect.gen(function* () {
          const pubsub = yield* PubSub.unbounded<number>()
          const currentPricesMap = new Map<string, number>()

          // get balances
          const balance = yield* pipe(
            Effect.tryPromise({
              try: () => bitvavo.balance(),
              catch: (err: unknown) =>
                new BitvavoSdkError({
                  method: 'balance',
                  message: `${err}`,
                }),
            }),
            Effect.retry(retrySchedule),
            Effect.andThen(Schema.decodeUnknown(Balance)),
            Effect.andThen(Array.sortWith(b => b.symbol, Order.string)),
            Effect.andThen(Array.filter(_ => _.symbol !== 'EUR')),
          )

          // derive markets from balances
          const markets = Array.map(balance, _ => `${_.symbol}-EUR`)

          // get trades
          const allTrades = yield* pipe(
            Effect.forEach(
              markets,
              market =>
                pipe(
                  Effect.tryPromise({
                    try: () => bitvavo.trades(market),
                    catch: (err: unknown) =>
                      new BitvavoSdkError({
                        method: 'trades',
                        message: `${err}`,
                      }),
                  }),
                  Effect.retry(retrySchedule),
                  Effect.andThen(Schema.decodeUnknownSync(Trades)),
                  Effect.andThen(Array.filter(trade => trade.side === 'buy')),
                ),
              { concurrency: 'unbounded' },
            ),
            Effect.andThen(Array.flatten),
          )

          // Initialize WebSocket connection
          yield* Effect.promise(() => bitvavo.websocket.checkSocket())

          // log WebSocket errors
          yield* pipe(
            Stream.async(emit => {
              bitvavo.getEmitter().on('error', (error: unknown) => {
                emit(Effect.succeed(Chunk.of(error)))
              })
            }),
            Stream.tap(err => Console.error('WebSocket error:', err)),
            Stream.runDrain,
            Effect.forkDaemon,
          )

          // use the ticker stream to update the current prices
          yield* pipe(
            Array.map(markets, market =>
              pipe(
                Stream.async(emit => {
                  bitvavo.websocket.subscriptionTicker24h(
                    market,
                    (response: unknown) => {
                      emit(Effect.succeed(Chunk.of(response)))
                    },
                  )
                }),
                Stream.throttle({
                  cost: () => 1,
                  duration: '2 seconds',
                  units: 1,
                }),
                Stream.filter(Schema.is(Ticker24h)),
                Stream.map(Schema.decodeUnknownSync(Ticker24h)),
              ),
            ),
            Stream.mergeAll({ concurrency: 'unbounded' }),
            Stream.tap(_ => {
              currentPricesMap.set(_.market, parseFloat(_.bid))
              return PubSub.publish(pubsub, _.timestamp)
            }),
            Stream.runDrain,
            Effect.forkDaemon,
          )

          // consume the pubsub stream to update the summary
          return Stream.fromPubSub(pubsub).pipe(
            Stream.map(() => getSummary(balance, allTrades)(currentPricesMap)),
          )
        }).pipe(
          Effect.scoped,
          Effect.tapError(err => Console.error(err)),
        )

      return { setup }
    }),
  },
) {}
