import * as E from "fp-ts/Either";
import * as TE from "fp-ts/TaskEither";
import { runScript } from "./apple-script";
import { withCatalogPlaybackLock } from "./catalog-lock";
import { startNativeCatalogSong } from "./catalog-native";
import { CatalogSong } from "./models";
import { catalogPlaybackUrl, catalogVerifyScript } from "./scripts/catalog";

export const playCatalogSong = (song: CatalogSong): TE.TaskEither<Error, void> =>
  TE.tryCatch(async () => {
    catalogPlaybackUrl(song); // Validate metadata and identity without opening the link.
    await withCatalogPlaybackLock(async () => {
      // Without a playback-session token, an error cannot prove ownership of the
      // current track. Never pause/stop as cleanup: the user may have changed songs.
      await startNativeCatalogSong(song.id);
      const result = await runScript(catalogVerifyScript, 20_000, [song.title, song.artist, song.album])();
      if (E.isLeft(result)) throw result.left;
      if (result.right.trim() !== "verified")
        throw new Error("Music did not confirm playback of the requested song. Check Music before retrying.");
    });
  }, E.toError);
