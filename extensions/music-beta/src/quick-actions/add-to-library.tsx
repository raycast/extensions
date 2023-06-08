import { Toast, closeMainWindow, showHUD, showToast } from "@raycast/api";
import { isLeft, toError } from "fp-ts/lib/Either";
import { pipe } from "fp-ts/lib/function";
import * as TE from "fp-ts/TaskEither";

import { api, isLoggedIn, trackToSong } from "@/lib/apple-music";
import { addToLibrary, getCurrentTrack } from "@/lib/apple-music/scripts/current-track";
import { useAuthActions } from "@/lib/hooks/useAuth";
import { Preferences } from "@/lib/preferences";
import { displayError, handleResult } from "@/lib/utils";

async function experimental_addToLibrary() {
	const track = await pipe(
		getCurrentTrack(),
		TE.chain((track) => TE.tryCatch(() => trackToSong(track), toError)),
		TE.chain((song) =>
			song
				? TE.tryCatch(() => api.me.library.add("songs", song?.id), toError)
				: TE.left(new Error("Could not retrive song"))
		)
	)();

	if (isLeft(track)) {
		displayError(track.left);
		return false;
	}

	if (track.right.status === 202) {
		showToast(Toast.Style.Success, "Added to library");
		if (Preferences.closeMainWindowOnControls) showHUD("Added to Library");
	} else {
		showToast(Toast.Style.Failure, "Could not add to library");
	}

	if (Preferences.closeMainWindowOnControls) {
		await closeMainWindow();
	}

	return true;
}

export default async function AddToLibrary() {
	if (Preferences.experimental_music_api) {
		const t = await showToast(Toast.Style.Animated, "Checking credentials...");

		const isLogged = await isLoggedIn();
		const { askToLogin } = useAuthActions();

		if (!isLogged) {
			t.style = Toast.Style.Failure;
			t.message = "Not logged in!";

			askToLogin();
			return;
		}

		t.title = "Adding to Library...";
		const success = await experimental_addToLibrary();

		if (success) return;
		t.hide();
	}

	return handleResult(addToLibrary, {
		successText: "Added to library",
		loading: "Adding to library...",
		errorMessage: "Could not add to library",
	})();
}
