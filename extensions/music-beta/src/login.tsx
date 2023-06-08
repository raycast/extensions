import {
	LaunchProps,
	updateCommandMetadata,
	open,
	closeMainWindow,
	showHUD,
	showToast,
	Toast,
	confirmAlert,
} from "@raycast/api";
import { z } from "zod";

import { api, isLoggedIn } from "./lib/apple-music";
import { askToEnableExperimentalApi } from "./lib/hooks/useMustHaveApiEnabled";
import { debug } from "./lib/logger";
import { Preferences } from "./lib/preferences";
import { Storage, StorageKeys } from "./lib/storage";

const contextSchema = z.object({
	token: z.string().optional(),
	force: z.boolean().optional(),
});

export default async function Login({ launchContext }: LaunchProps) {
	const context = contextSchema.safeParse(launchContext);

	if (context.success && context.data.token) {
		showToast(Toast.Style.Animated, "Logging in...");

		// save the user token into the localstorage
		await Storage.set(StorageKeys.UserToken, context.data.token);
		debug("User Token updated");

		// get user storefront
		const response = await api.authenticated.me.storefront();
		const storefront = response.data.data[0].id;

		// save the right storefront
		await Storage.set(StorageKeys.StoreFront, storefront);
		debug("Storefront updated: " + storefront);

		showToast(Toast.Style.Success, "Logged in successfully!");

		await open("raycast://confetti");

		updateCommandMetadata({
			subtitle: "Refresh the token",
		});

		return;
	}

	if (!Preferences.experimental_music_api) {
		await askToEnableExperimentalApi();
	}

	const isLogged = await isLoggedIn();

	if (!isLogged || (context.success && context.data.force)) {
		await confirmAlert({
			title: "You need to login to Raycast Music",
			message: "Do you want to open the login page?",
			primaryAction: {
				title: "Login",
				onAction: () => {
					showHUD("Opening the login page...");
					open("https://raycast-music.app/auth");
				},
			},
		});

		return;
	}

	showToast(Toast.Style.Success, "You are already logged in!");
	closeMainWindow();
	return;
}
