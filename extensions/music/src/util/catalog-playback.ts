import * as E from "fp-ts/Either";
import * as TE from "fp-ts/TaskEither";
import { runScript } from "./apple-script";
import { withCatalogPlaybackLock } from "./catalog-lock";
import { NativeCatalogError, startNativeCatalogSong } from "./catalog-native";
import { CatalogSong } from "./models";
import { catalogPauseScript, catalogPlaybackUrl, catalogVerifyScript } from "./scripts/catalog";

export const playCatalogSong = (song: CatalogSong): TE.TaskEither<Error, void> =>
  TE.tryCatch(async () => {
    catalogPlaybackUrl(song); // Validate metadata and identity without opening the link.
    await withCatalogPlaybackLock(async () => {
      let started = false;
      try {
        await startNativeCatalogSong(song.id);
        started = true;
        const result = await runScript(catalogVerifyScript(song), 20_000)();
        if (E.isLeft(result)) throw result.left;
        if (result.right.trim() !== "verified")
          throw new Error("Music did not confirm playback of the requested song.");
      } catch (error) {
        if (started || (error instanceof NativeCatalogError && error.playbackAttempted)) {
          const paused = await runScript(catalogPauseScript)();
          if (E.isLeft(paused)) {
            throw new Error(`${E.toError(error).message} Could not pause unverified playback: ${paused.left.message}`);
          }
        }
        throw error;
      }
    });
  }, E.toError);
