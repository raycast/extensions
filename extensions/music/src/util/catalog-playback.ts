import * as E from "fp-ts/Either";
import * as TE from "fp-ts/TaskEither";
import { runScript } from "./apple-script";
import { getCatalogAlbum } from "./catalog-api";
import { withCatalogPlaybackLock } from "./catalog-lock";
import { CatalogSong } from "./models";
import {
  catalogAlbumId,
  catalogNotificationScript,
  catalogPlaybackPlan,
  catalogPlaybackScript,
  catalogRestoreScript,
  catalogStateScript,
  parseCatalogState,
} from "./scripts/catalog";

async function checkedScript(script: string, timeout = 10_000): Promise<string> {
  const result = await runScript(script, timeout)();
  if (E.isLeft(result)) throw result.left;
  return result.right.trim();
}

export const playCatalogSong = (song: CatalogSong): TE.TaskEither<Error, void> =>
  TE.tryCatch(async () => {
    const album = await getCatalogAlbum(catalogAlbumId(song))();
    if (E.isLeft(album)) throw album.left;
    const plan = catalogPlaybackPlan(song, album.right);

    await withCatalogPlaybackLock(async () => {
      const state = parseCatalogState(await checkedScript(catalogStateScript));
      let confirmed = false;
      let failure: Error | undefined;
      try {
        const result = await checkedScript(catalogPlaybackScript(plan), 60_000);
        if (result !== "verified") throw new Error("Music did not confirm playback of the requested song.");
        confirmed = true;
      } catch (error) {
        failure = E.toError(error);
      } finally {
        try {
          const restored = await checkedScript(catalogRestoreScript(state, song, confirmed));
          if (confirmed && restored !== "verified") {
            failure = new Error("The requested song was no longer playing. Playback has been paused.");
          }
        } catch (error) {
          failure = new Error(
            `${failure ? failure.message + " " : ""}Could not restore Music's volume/shuffle: ${E.toError(error).message}`,
          );
        }
      }
      if (failure) throw failure;
      // Disabled notifications must not turn successfully verified playback into an error.
      await runScript(catalogNotificationScript(song))();
    });
  }, E.toError);
