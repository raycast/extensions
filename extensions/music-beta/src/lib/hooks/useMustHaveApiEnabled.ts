import { Alert, confirmAlert, openExtensionPreferences, popToRoot, useNavigation } from "@raycast/api";
import { useEffect } from "react";

import { Preferences } from "../preferences";

export const askToEnableExperimentalApi = (onCancel?: () => void) =>
	confirmAlert({
		icon: "icon.png",
		title: "Music API is not enabled",
		message: "This command requires the Music API to be enabled. Would you like to enable it now?",
		primaryAction: {
			title: "Enable",
			onAction: openExtensionPreferences,
		},
		dismissAction:
			typeof onCancel === "function"
				? {
						title: "Cancel",
						onAction: onCancel,
				  }
				: undefined,
	});

export default function useMustHaveApiEnabled(prompt = true) {
	const nav = useNavigation();

	useEffect(() => {
		if (Preferences.experimental_music_api || !prompt) return;
		askToEnableExperimentalApi(nav.pop);
	}, []);

	return Preferences.experimental_music_api;
}
