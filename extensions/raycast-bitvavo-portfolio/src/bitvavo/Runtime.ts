import { ConfigProvider, Effect, Layer, Logger, pipe } from 'effect'
import { PortfolioStreamService } from './PortfolioStreamService'

export const run =
  (config: Map<string, string>) =>
  <A, E, R>(effect: Effect.Effect<A, E, R>) =>
    pipe(
      effect,
      Effect.provide(
        Layer.mergeAll(PortfolioStreamService.Default, Logger.pretty),
      ),
      Effect.withConfigProvider(ConfigProvider.fromMap(config)),
      _ => _ as Effect.Effect<A, E, never>,
      Effect.runFork,
    )
