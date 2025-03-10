import { Effect, Layer, ManagedRuntime } from "effect";
import { MuxService } from "./MuxService.js";
import { MuxRepo } from "./MuxRepo.js";
import { NodeContext, NodeHttpClient } from "@effect/platform-node";
import Raycast from "raycast-effect";
import { Preferences } from "./Preferences.js";

export const Runtime = ManagedRuntime.make(
  MuxRepo.Default.pipe(
    Layer.provideMerge(MuxService.Default),
    Layer.provideMerge(Preferences.Default),
    Layer.merge(NodeContext.layer),
    Layer.merge(NodeHttpClient.layer),
    Layer.merge(Raycast.layer),
  ),
);

export default Runtime;

export const effectCommand = Raycast.command(Runtime);

export const effectView = Raycast.view(Runtime);

export const useEffectFn = <T, E, R extends ManagedRuntime.ManagedRuntime.Context<typeof Runtime>, A>(
  effect: (...args: A[]) => Effect.Effect<T, E, R>,
) => {
  return async (...args: A[]) => await effect(...args).pipe(Runtime.runPromise);
};
