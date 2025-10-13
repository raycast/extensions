import Mux from "@mux/mux-node";
import { Effect } from "effect";
import { Preferences } from "./Preferences.js";

export class MuxService extends Effect.Service<MuxService>()("MuxService", {
  effect: Effect.gen(function* () {
    const prefs = yield* Preferences;
    return new Mux({
      tokenId: prefs.accessTokenId,
      tokenSecret: prefs.secretKey,
    });
  }),
}) {}
