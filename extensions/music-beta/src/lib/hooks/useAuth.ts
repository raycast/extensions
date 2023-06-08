import { Alert, Icon, LaunchType, confirmAlert, launchCommand, popToRoot } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { useEffect } from "react";

import useMustHaveApiEnabled from "./useMustHaveApiEnabled";
import { isLoggedIn as checkAuth } from "../apple-music";

export function useAuthActions() {
	const login = () =>
		launchCommand({
			type: LaunchType.UserInitiated,
			name: "login",
			extensionName: "music",
			ownerOrAuthorName: "fedevitaledev",
			context: {
				force: true,
			},
		});

	const askToLogin = (onCancel?: () => void) =>
		confirmAlert({
			icon: Icon.Lock,
			title: "Not logged in",
			message: "You need to be logged in to use this extension. Please login in the preferences.",
			dismissAction: onCancel && {
				title: "Close",
				style: Alert.ActionStyle.Cancel,
				onAction: onCancel,
			},
			primaryAction: {
				title: "Login",
				style: Alert.ActionStyle.Default,
				onAction: login,
			},
		});

	return {
		authorize: login,
		askToLogin,
	};
}

export default function useAuth(prompt = true) {
	const isEnabled = useMustHaveApiEnabled(prompt);

	const { data: isLoggedIn, isLoading } = useCachedPromise(checkAuth, [], {
		execute: isEnabled,
	});

	const { authorize, askToLogin } = useAuthActions();

	useEffect(() => {
		if (!prompt || isLoading || isLoggedIn) return;
		askToLogin();
	}, [isLoggedIn, askToLogin, prompt, isLoading]);

	return { isLoggedIn, isMusicApiEnabled: isEnabled, authorize, askToLogin, isLoading };
}
