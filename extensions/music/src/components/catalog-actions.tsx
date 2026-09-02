import { Action, Alert, confirmAlert, Icon, showToast, Toast } from "@raycast/api";
import { pipe } from "fp-ts/lib/function";
import * as T from "fp-ts/Task";
import * as TE from "fp-ts/TaskEither";

import { addToLibrary, isInLibrary } from "../util/catalog-api";

const ADD_TITLES = {
  songs: "Add Song to Library",
  albums: "Add Album to Library",
} as const;

/** Add a catalog item to the library, checking membership at action time and
 * asking before re-adding an item that is already there. */
export function AddToLibraryAction({ kind, id, title }: { kind: keyof typeof ADD_TITLES; id: string; title: string }) {
  return (
    <Action
      title={ADD_TITLES[kind]}
      icon={Icon.Plus}
      shortcut={{ modifiers: ["cmd", "shift"], key: "l" }}
      onAction={async () => {
        const toast = await showToast({ style: Toast.Style.Animated, title: "Adding to Library…" });

        const alreadyInLibrary = await pipe(
          isInLibrary(kind, id),
          // A failed check must not block the add — worst case the user
          // misses a duplicate warning, not the add itself.
          TE.getOrElse(() => T.of(false)),
        )();

        if (alreadyInLibrary) {
          // An animated toast never resolves on its own — hide it before the
          // alert so a Cancel doesn't leave it spinning forever.
          await toast.hide();
          const confirmed = await confirmAlert({
            title: "Already in Library",
            message: `"${title}" is already in your library. Add it anyway?`,
            icon: Icon.QuestionMark,
            primaryAction: { title: "Add Anyway", style: Alert.ActionStyle.Default },
          });
          if (!confirmed) return;
          await showToast({ style: Toast.Style.Animated, title: "Adding to Library…" });
        }

        await pipe(
          addToLibrary(kind, id),
          TE.match(
            (error) => {
              showToast({ style: Toast.Style.Failure, title: "Add to Library Failed", message: error.message });
            },
            () => {
              // 202 means Apple accepted the add, not that it has landed — it
              // arrives via cloud sync, so the copy promises "shortly".
              showToast({
                style: Toast.Style.Success,
                title: `Added "${title}"`,
                message: "It will appear in your library shortly.",
              });
            },
          ),
        )();
      }}
    />
  );
}

export function OpenInMusicAction({ url }: { url: string | null }) {
  if (!url) return null;
  // The music: scheme hands the page to Music.app; the https URL would open
  // the web player in the browser instead.
  return <Action.Open title="Open in Music" icon={Icon.Music} target={url.replace(/^https:/, "music:")} />;
}
